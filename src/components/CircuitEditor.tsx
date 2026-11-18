import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eraser, LayoutGrid, Lightbulb, Redo2, Trash2, Undo2, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import type { Bit } from '../logic/boolean';
import {
  GATE_TYPES, SIMPLIFY_LIMIT, analyzeOutput, autoLayout, circuitFromExpressions, circuitIssues, connect, driverMap, emptyCircuit, isGate, isValidLabel,
  makeNode, parseCircuit, pinCount, pruneWires, removeNode, serializeCircuit, simulate, toUniversal,
  type CNode, type Circuit, type GateType,
} from '../logic/circuit';
import { CircuitAnalysis } from './CircuitAnalysis';
import { GATE_W, GateBody, IO_W, inPin, ioColor, outPin, size, wirePath } from './CircuitDiagram';
import { TUTORIAL_STEPS } from '../logic/tutorial';

// ───────────────────────── Geometría y símbolos ─────────────────────────

const NAMES: Record<GateType, string> = {
  INPUT: 'Entrada', OUTPUT: 'Salida', NOT: 'NOT', AND: 'AND', OR: 'OR', NAND: 'NAND', NOR: 'NOR', XOR: 'XOR', XNOR: 'XNOR',
};
const HELP: Record<GateType, string> = {
  INPUT: 'Interruptor', OUTPUT: 'LED', NOT: 'Inversor', AND: 'Y', OR: 'O', NAND: 'NO-Y', NOR: 'NO-O', XOR: 'O exclusiva', XNOR: 'Coincidencia',
};

type Pending = { from: string; x: number; y: number; sx: number; sy: number; dragging: boolean };

const STORAGE_KEY = 'logiclab.circuit.v1';
export const TUTORIAL_KEY = 'logiclab.tutorial.v1';
const EXAMPLES: { label: string; expr: string }[] = [
  { label: 'Alarma del laboratorio', expr: "Z = B + T'*S*(P+M)" },
  { label: 'Medio sumador', expr: 'S = A^B; C = A*B' },
  { label: 'Mayoría de 3', expr: 'M = A*B + A*C + B*C' },
  { label: 'Multiplexor 2:1', expr: "Y = S'*A + S*B" },
];

export type CircuitEditorProps = {
  /** Circuito inicial (si no se da, se recupera el último guardado en el navegador). */
  initial?: Circuit;
  /** Clave de autoguardado; sin clave no se guarda. */
  storageKey?: string | null;
  /** Compuertas permitidas en la paleta (por defecto todas). */
  allowedGates?: GateType[];
  /** Impide añadir, borrar o renombrar entradas y salidas (ejercicios). */
  lockIO?: boolean;
  showAnalysis?: boolean;
  showBuilder?: boolean;
  onChange?: (circuit: Circuit) => void;
  height?: number;
};

export function CircuitEditor({ initial, storageKey = STORAGE_KEY, allowedGates = GATE_TYPES, lockIO = false, showAnalysis = true, showBuilder = true, onChange, height = 460 }: CircuitEditorProps) {
  const [hist, setHist] = useState<{ past: Circuit[]; present: Circuit; future: Circuit[] }>(() => {
    let present = initial ?? emptyCircuit();
    if (!initial && storageKey) {
      try { const raw = localStorage.getItem(storageKey); if (raw) present = parseCircuit(raw); } catch { /* sin almacenamiento */ }
    }
    return { past: [], present, future: [] };
  });
  const circuit = hist.present;
  const [inputValues, setInputValues] = useState<Record<string, Bit>>({});
  const [selected, setSelected] = useState<{ kind: 'node' | 'wire'; id: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState('');
  const [exprText, setExprText] = useState('');
  const [showNames, setShowNames] = useState(true);
  // Tutorial guiado: se inicia solo la primera vez que se abre el editor vacío.
  const [tour, setTour] = useState<number | null>(() => {
    if (!showAnalysis || hist.present.nodes.length) return null;
    try { return localStorage.getItem(TUTORIAL_KEY) ? null : 0; } catch { return null; }
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; start: Circuit; sx: number; sy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const commit = useCallback((next: Circuit) => setHist(h => ({ past: [...h.past.slice(-99), h.present], present: next, future: [] })), []);
  const undo = () => setHist(h => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  const redo = () => setHist(h => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));

  useEffect(() => {
    onChange?.(circuit);
    if (storageKey) { try { localStorage.setItem(storageKey, serializeCircuit(circuit)); } catch { /* ignorar */ } }
  }, [circuit, onChange, storageKey]);

  const values = useMemo(() => simulate(circuit, inputValues), [circuit, inputValues]);
  const tourStep = tour !== null ? TUTORIAL_STEPS[tour] : null;
  const tourDone = tourStep?.done ? tourStep.done(circuit, values) : false;
  const finishTour = () => { setTour(null); try { localStorage.setItem(TUTORIAL_KEY, 'done'); } catch { /* ignorar */ } };
  useEffect(() => {
    if (tour === null || !tourDone) return;
    const t = setTimeout(() => setTour(k => (k === null ? null : k + 1 >= TUTORIAL_STEPS.length ? k : k + 1)), 900);
    return () => clearTimeout(t);
  }, [tour, tourDone]);
  const startTour = () => {
    if (circuit.nodes.length && !confirm('El tutorial empieza con un lienzo vacío. Podrás recuperar tu circuito con «Deshacer». ¿Continuar?')) return;
    if (circuit.nodes.length) { commit(emptyCircuit()); setSelected(null); setHighlight(null); setPending(null); setInputValues({}); }
    setTour(0);
  };
  const drivers = useMemo(() => driverMap(circuit), [circuit]);
  const byId = useMemo(() => new Map(circuit.nodes.map(n => [n.id, n])), [circuit]);
  const issues = useMemo(() => circuitIssues(circuit), [circuit]);
  const errors = issues.filter(i => i.level === 'error');
  const hiPairs = useMemo(() => {
    const set = new Set<string>();
    if (highlight) for (let i = 0; i < highlight.length - 1; i++) set.add(`${highlight[i]}>${highlight[i + 1]}`);
    return set;
  }, [highlight]);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
  };

  const extent = useMemo(() => {
    let w = 900; let h = height;
    for (const n of circuit.nodes) { w = Math.max(w, n.x + 160); h = Math.max(h, n.y + 120); }
    return { w, h };
  }, [circuit, height]);

  // ── Acciones sobre el circuito ──
  const addNode = (type: GateType, x?: number, y?: number) => {
    if (type !== 'INPUT' && type !== 'OUTPUT' && !allowedGates.includes(type)) return;
    const count = circuit.nodes.length;
    const px = x ?? 140 + (count % 6) * 34;
    const py = y ?? 40 + (count % 8) * 46;
    const node = makeNode(circuit, type, Math.max(0, Math.round(px / 10) * 10), Math.max(0, Math.round(py / 10) * 10));
    commit({ ...circuit, nodes: [...circuit.nodes, node] });
    setSelected({ kind: 'node', id: node.id });
    setStatus(`${NAMES[type]} agregada.`);
  };

  const deleteSelection = () => {
    if (!selected) return;
    if (selected.kind === 'wire') commit({ ...circuit, wires: circuit.wires.filter(w => w.id !== selected.id) });
    else {
      const n = byId.get(selected.id);
      if (lockIO && n && (n.type === 'INPUT' || n.type === 'OUTPUT')) { setStatus('En este ejercicio no puedes borrar entradas ni salidas.'); return; }
      commit(removeNode(circuit, selected.id));
    }
    setSelected(null);
    setHighlight(null);
  };

  const updateNode = (id: string, patch: Partial<CNode>) => {
    commit(pruneWires({ ...circuit, nodes: circuit.nodes.map(n => (n.id === id ? { ...n, ...patch } : n)) }));
  };

  const tryConnect = (from: string, to: string, pin: number) => {
    const next = connect(circuit, from, to, pin);
    if (next === circuit) setStatus('No se puede conectar: formaría un ciclo (no se admite realimentación).');
    else { commit(next); setStatus('Cable conectado.'); }
  };

  const replaceWith = (next: Circuit, message: string) => {
    commit(next);
    setSelected(null); setHighlight(null); setPending(null);
    setStatus(message);
  };

  const runTransform = (kind: 'simplify' | 'NAND' | 'NOR') => {
    if (errors.length) { setStatus('Completa y corrige el circuito antes de transformarlo.'); return; }
    try {
      if (kind === 'simplify') {
        const outs = circuit.nodes.filter(n => n.type === 'OUTPUT');
        const text = outs.map(o => { const a = analyzeOutput(circuit, o.id); if (!a || !a.simplified) throw new Error(`Para simplificar, cada salida debe depender de ${SIMPLIFY_LIMIT} entradas o menos.`); return `${o.label} = ${a.sop}`; }).join('; ');
        const before = circuit.nodes.filter(n => isGate(n.type)).length;
        const next = circuitFromExpressions(text);
        replaceWith(next, `Circuito simplificado: de ${before} a ${next.nodes.filter(n => isGate(n.type)).length} compuertas.`);
      } else {
        const next = toUniversal(circuit, kind);
        replaceWith(next, `Convertido a solo ${kind}: ${next.nodes.filter(n => isGate(n.type)).length} compuertas.`);
      }
    } catch (e) { setStatus(e instanceof Error ? e.message : 'No se pudo transformar el circuito.'); }
  };

  const buildFromText = (text: string, simplified = false) => {
    try {
      replaceWith(circuitFromExpressions(text, simplified), 'Circuito construido desde la expresión.');
      setInputValues({});
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Expresión inválida.'); }
  };

  // ── Exportar / importar ──
  const download = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const svgMarkup = () => {
    const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('style');
    clone.setAttribute('width', String(extent.w));
    clone.setAttribute('height', String(extent.h));
    clone.querySelectorAll('[data-ui]').forEach(el => el.remove());
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  };
  const exportSvg = () => download('circuito.svg', new Blob([svgMarkup()], { type: 'image/svg+xml' }));
  const exportPng = () => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgMarkup()], { type: 'image/svg+xml' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = extent.w * 2; canvas.height = extent.h * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b && download('circuito.png', b));
    };
    img.src = url;
  };
  const importJson = async (file: File) => {
    try { replaceWith(parseCircuit(await file.text()), `Circuito "${file.name}" cargado.`); }
    catch (e) { setStatus(e instanceof Error ? e.message : 'No se pudo leer el archivo.'); }
  };

  // ── Interacción con el lienzo ──
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); }
    else if (e.key === 'Escape') { setPending(null); setSelected(null); }
  };

  const onNodeDown = (e: React.PointerEvent, n: CNode) => {
    if (e.button !== 0) return;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false, start: circuit, sx: e.clientX, sy: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setSelected({ kind: 'node', id: n.id });
  };
  const onNodeMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    d.moved = true;
    const p = toSvg(e.clientX, e.clientY);
    const x = Math.max(0, Math.round((p.x - d.dx) / 10) * 10);
    const y = Math.max(0, Math.round((p.y - d.dy) / 10) * 10);
    setHist(h => ({ ...h, present: { ...h.present, nodes: h.present.nodes.map(n => (n.id === d.id ? { ...n, x, y } : n)) } }));
  };
  const onNodeUp = (e: React.PointerEvent, n: CNode) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) setHist(h => ({ past: [...h.past.slice(-99), d.start], present: h.present, future: [] }));
    else if (n.type === 'INPUT') setInputValues(v => ({ ...v, [n.id]: v[n.id] ? 0 : 1 }));
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  const startWire = (e: React.PointerEvent, n: CNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    svgRef.current!.setPointerCapture(e.pointerId);
    const m = toSvg(e.clientX, e.clientY);
    setPending({ from: n.id, x: m.x, y: m.y, sx: m.x, sy: m.y, dragging: true });
    setSelected(null);
  };
  const onSvgMove = (e: React.PointerEvent) => {
    if (!pending) return;
    const m = toSvg(e.clientX, e.clientY);
    setPending({ ...pending, x: m.x, y: m.y });
  };
  const onSvgUp = (e: React.PointerEvent) => {
    if (!pending?.dragging) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-in-pin]') as HTMLElement | null;
    if (target) { tryConnect(pending.from, target.dataset.node!, Number(target.dataset.pin)); setPending(null); }
    else if (Math.hypot(pending.x - pending.sx, pending.y - pending.sy) < 6) { setPending({ ...pending, dragging: false }); setStatus('Origen elegido: haz clic en una entrada de compuerta para conectar (Esc cancela).'); }
    else setPending(null);
  };
  const onPinClick = (n: CNode, pin: number) => {
    if (pending && !pending.dragging) { tryConnect(pending.from, n.id, pin); setPending(null); }
  };
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg')) { setSelected(null); setPending(null); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/logiclab-gate') as GateType;
    if (!type) return;
    const p = toSvg(e.clientX, e.clientY);
    const s = type === 'INPUT' || type === 'OUTPUT' ? { w: IO_W, h: 40 } : { w: GATE_W, h: 40 };
    addNode(type, p.x - s.w / 2, p.y - s.h / 2);
  };

  const selectedNode = selected?.kind === 'node' ? byId.get(selected.id) : undefined;
  const paletteTypes: GateType[] = [...(lockIO ? [] : (['INPUT', 'OUTPUT'] as GateType[])), ...GATE_TYPES.filter(t => allowedGates.includes(t))];

  // ── Render ──

  return (
    <div className={`grid gap-4 ${showAnalysis ? 'xl:grid-cols-[minmax(0,1fr)_27rem] xl:items-start' : ''}`} onKeyDown={onKeyDown}>
      <div className="order-1 min-w-0 bg-white rounded-xl border border-slate-200 overflow-hidden xl:col-start-1 xl:row-start-1">
        {tourStep && tour !== null && (
          <section aria-label="Tutorial guiado" className="p-4 bg-amber-50 border-b border-amber-300">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-amber-900">Tutorial · Paso {tour + 1} de {TUTORIAL_STEPS.length}</p>
                <h2 className="text-lg font-bold text-slate-900">{tourStep.title}</h2>
                <p aria-live="polite" className="text-sm text-slate-800 mt-1">{tourStep.text}</p>
                {tourDone && <p role="status" className="mt-2 text-sm font-semibold text-green-800">✓ ¡Hecho!</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={finishTour} className="px-3 py-1.5 rounded-lg border border-slate-400 bg-white hover:bg-slate-50 text-sm">{tour === TUTORIAL_STEPS.length - 1 ? 'Cerrar' : 'Omitir tutorial'}</button>
                <button disabled={tour === 0} onClick={() => setTour(tour - 1)} className="px-3 py-1.5 rounded-lg border border-slate-400 bg-white hover:bg-slate-50 text-sm disabled:opacity-40">Anterior</button>
                <button onClick={() => (tour === TUTORIAL_STEPS.length - 1 ? finishTour() : setTour(tour + 1))} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium">{tour === TUTORIAL_STEPS.length - 1 ? 'Finalizar' : tourDone || !tourStep.done ? 'Siguiente' : 'Saltar paso'}</button>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-amber-200 rounded" aria-hidden="true"><div className="h-full bg-amber-600 rounded transition-all" style={{ width: `${((tour + 1) / TUTORIAL_STEPS.length) * 100}%` }} /></div>
          </section>
        )}

        {/* Paleta */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
          <span className="text-xs font-semibold uppercase text-slate-600 mr-1">Arrastra al lienzo:</span>
          {paletteTypes.map(t => (
            <button key={t} draggable onDragStart={e => { e.dataTransfer.setData('text/logiclab-gate', t); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => addNode(t)} aria-label={`Agregar ${NAMES[t]} (${HELP[t]})`} title={`${NAMES[t]} · ${HELP[t]} — arrastra o haz clic`}
              className={`flex flex-col items-center px-2 py-1 rounded-lg border bg-white hover:bg-indigo-50 hover:border-indigo-400 cursor-grab active:cursor-grabbing min-w-14 ${tourStep?.highlight === t && !tourDone ? 'border-amber-500 ring-4 ring-amber-300' : 'border-slate-300'}`}>
              <svg width="46" height="26" viewBox="-2 -2 86 44" aria-hidden="true" className="pointer-events-none">
                {t === 'INPUT' ? <><rect x="0" y="6" width="56" height="28" rx="6" fill="#fff" stroke="#334155" strokeWidth="3" /><text x="28" y="26" textAnchor="middle" fontSize="20" fontWeight="700">A</text></>
                  : t === 'OUTPUT' ? <><circle cx="40" cy="20" r="16" fill="#fff" stroke="#334155" strokeWidth="3" /><path d="M0 20 H24" stroke="#334155" strokeWidth="3" /></>
                  : <GateBody type={t} h={40} stroke="#334155" fill="#fff" sw={3} />}
              </svg>
              <span className="text-[11px] font-medium text-slate-700">{NAMES[t]}</span>
            </button>
          ))}
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-200 text-sm">
          <ToolBtn icon={<Undo2 className="w-4 h-4" />} label="Deshacer" onClick={undo} disabled={!hist.past.length} />
          <ToolBtn icon={<Redo2 className="w-4 h-4" />} label="Rehacer" onClick={redo} disabled={!hist.future.length} />
          <ToolBtn icon={<LayoutGrid className="w-4 h-4" />} label="Acomodar" onClick={() => replaceWith(autoLayout(circuit), 'Circuito acomodado.')} disabled={!circuit.nodes.length} />
          <ToolBtn icon={<Trash2 className="w-4 h-4" />} label="Borrar selección" onClick={deleteSelection} disabled={!selected} />
          {!lockIO && <ToolBtn icon={<Eraser className="w-4 h-4" />} label="Limpiar todo" onClick={() => { if (!circuit.nodes.length || confirm('¿Borrar todo el circuito?')) replaceWith(emptyCircuit(), 'Lienzo limpio.'); }} />}
          <span className="mx-1 w-px h-5 bg-slate-300" aria-hidden="true" />
          <ToolBtn icon={<ZoomOut className="w-4 h-4" />} label="Alejar" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.15).toFixed(2)))} />
          <span className="text-xs w-10 text-center tabular-nums" aria-live="off">{Math.round(zoom * 100)}%</span>
          <ToolBtn icon={<ZoomIn className="w-4 h-4" />} label="Acercar" onClick={() => setZoom(z => Math.min(1.8, +(z + 0.15).toFixed(2)))} />
          <label className="flex items-center gap-1 text-xs ml-2"><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> Nombres</label>
          <span className="mx-1 w-px h-5 bg-slate-300" aria-hidden="true" />
          <ToolBtn icon={<Download className="w-4 h-4" />} label="SVG" onClick={exportSvg} disabled={!circuit.nodes.length} />
          <ToolBtn icon={<Download className="w-4 h-4" />} label="PNG" onClick={exportPng} disabled={!circuit.nodes.length} />
          <ToolBtn icon={<Download className="w-4 h-4" />} label="JSON" onClick={() => download('circuito.json', new Blob([serializeCircuit(circuit)], { type: 'application/json' }))} disabled={!circuit.nodes.length} />
          <ToolBtn icon={<Upload className="w-4 h-4" />} label="Abrir JSON" onClick={() => fileRef.current?.click()} />
          {showAnalysis && <ToolBtn icon={<Lightbulb className="w-4 h-4" />} label="Tutorial" onClick={startTour} />}
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de circuito JSON" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>

        {/* Lienzo */}
        <div className="overflow-auto bg-slate-50" style={{ maxHeight: height + 40 }} tabIndex={0} aria-label="Lienzo del circuito. Flechas para desplazar.">
          <svg
            ref={svgRef} role="group" aria-label="Diagrama del circuito"
            width={extent.w * zoom} height={extent.h * zoom} viewBox={`0 0 ${extent.w} ${extent.h}`}
            style={{ touchAction: 'none', display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
            onDragStart={e => e.preventDefault()}
            onPointerMove={onSvgMove} onPointerUp={onSvgUp} onPointerDown={onBackgroundDown}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={onDrop}
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd5e1" /></pattern>
            </defs>
            <rect data-bg="1" data-ui="1" width="100%" height="100%" fill="url(#grid)" />
            {!circuit.nodes.length && (
              <text data-ui="1" x="50%" y="45%" textAnchor="middle" fontSize="16" fill="#64748b">Arrastra entradas, compuertas y salidas aquí, o carga un ejemplo abajo.</text>
            )}

            {/* Cables */}
            {circuit.wires.map(w => {
              const a = byId.get(w.from); const b = byId.get(w.to);
              if (!a || !b) return null;
              const p1 = outPin(a); const p2 = inPin(b, w.pin);
              const v = values.get(w.from);
              const hi = hiPairs.has(`${w.from}>${w.to}`);
              const isSel = selected?.kind === 'wire' && selected.id === w.id;
              const d = wirePath(p1.x, p1.y, p2.x, p2.y);
              return (
                <g key={w.id}>
                  {hi && <path d={d} fill="none" stroke="#fb923c" strokeWidth="9" opacity="0.5" strokeLinecap="round" />}
                  <path d={d} fill="none" stroke={isSel ? '#4338ca' : ioColor(v)} strokeWidth={isSel ? 4 : v === 1 ? 3 : 2.2} strokeDasharray={v === null || v === undefined ? '5 4' : undefined} />
                  <path data-ui="1" d={d} fill="none" stroke="transparent" strokeWidth="14" style={{ cursor: 'pointer' }}
                    onPointerDown={e => { e.stopPropagation(); setSelected({ kind: 'wire', id: w.id }); }} />
                </g>
              );
            })}

            {/* Nodos */}
            {circuit.nodes.map(n => {
              const { w, h } = size(n);
              const v = values.get(n.id);
              const isSel = selected?.kind === 'node' && selected.id === n.id;
              const stroke = isSel ? '#4338ca' : '#334155';
              const op = outPin(n);
              return (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} style={{ cursor: 'grab' }}
                  onPointerDown={e => onNodeDown(e, n)} onPointerMove={onNodeMove} onPointerUp={e => onNodeUp(e, n)}>
                  {n.type === 'INPUT' && (
                    <>
                      <rect width={w} height={h} rx="8" fill={inputValues[n.id] ? '#dcfce7' : '#fff'} stroke={stroke} strokeWidth={isSel ? 3 : 2} />
                      <text x="14" y="26" fontSize="16" fontWeight="700" fill="#0f172a">{n.label || '?'}</text>
                      <rect x="40" y="12" width="18" height="16" rx="8" fill={inputValues[n.id] ? '#16a34a' : '#cbd5e1'} />
                      <circle cx={inputValues[n.id] ? 52 : 46} cy="20" r="6" fill="#fff" />
                      <text x="2" y="-4" fontSize="10" fill="#475569">{inputValues[n.id] ? '1' : '0'}</text>
                    </>
                  )}
                  {n.type === 'OUTPUT' && (
                    <>
                      <path d={`M0 20 H${w - 28}`} stroke={ioColor(drivers.has(`${n.id}:0`) ? values.get(drivers.get(`${n.id}:0`)!) : null)} strokeWidth="2.5" />
                      <circle cx={w - 18} cy="20" r="16" fill={v === 1 ? '#fde047' : '#f1f5f9'} stroke={stroke} strokeWidth={isSel ? 3 : 2} />
                      <text x={w - 18} y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{v === null || v === undefined ? '?' : v}</text>
                      <text x={w - 18} y="-6" textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{n.label}</text>
                    </>
                  )}
                  {isGate(n.type) && (
                    <>
                      <rect width={w} height={h} fill="transparent" />
                      <GateBody type={n.type} h={h} stroke={stroke} fill={v === 1 ? '#dcfce7' : '#ffffff'} sw={isSel ? 3 : 2} />
                      {showNames && <text x={w / 2 - 4} y={h + 12} textAnchor="middle" fontSize="10" fill="#475569">{n.type}</text>}
                    </>
                  )}
                  {/* pines de entrada */}
                  {Array.from({ length: pinCount(n) }, (_, i) => {
                    const p = inPin(n, i);
                    const connected = drivers.has(`${n.id}:${i}`);
                    return (
                      <g key={i}>
                        {n.type !== 'OUTPUT' && <path d={`M0 ${p.y - n.y} H${n.type === 'NOT' ? 2 : ['OR', 'NOR', 'XOR', 'XNOR'].includes(n.type) ? 10 : 5}`} stroke="#334155" strokeWidth="2" />}
                        <circle data-in-pin="1" data-node={n.id} data-pin={i} cx="0" cy={p.y - n.y} r={pending ? 9 : 6}
                          fill={connected ? '#334155' : pending ? '#c7d2fe' : '#fff'} stroke={connected ? '#334155' : '#ef4444'} strokeWidth="2"
                          style={{ cursor: pending ? 'crosshair' : 'default' }} onPointerDown={e => e.stopPropagation()} onClick={() => onPinClick(n, i)}>
                          <title>{`Entrada ${i + 1} de ${NAMES[n.type]}${connected ? '' : ' (sin conectar)'}`}</title>
                        </circle>
                      </g>
                    );
                  })}
                  {/* pin de salida */}
                  {n.type !== 'OUTPUT' && (
                    <g>
                      {isGate(n.type) && <path d={`M${n.type === 'NOT' || ['NAND', 'NOR', 'XNOR'].includes(n.type) ? w - 4 : 70} ${op.y - n.y} H${w}`} stroke="#334155" strokeWidth="2" />}
                      <circle cx={w} cy={op.y - n.y} r="7" fill={pending?.from === n.id ? '#4338ca' : '#fff'} stroke="#334155" strokeWidth="2" style={{ cursor: 'crosshair' }}
                        onPointerDown={e => startWire(e, n)}>
                        <title>{`Salida de ${NAMES[n.type]}: arrastra a una entrada para conectar`}</title>
                      </circle>
                    </g>
                  )}
                </g>
              );
            })}

            {pending && (() => {
              const a = byId.get(pending.from);
              if (!a) return null;
              const p = outPin(a);
              return <path data-ui="1" d={wirePath(p.x, p.y, pending.x, pending.y)} fill="none" stroke="#4338ca" strokeWidth="2.5" strokeDasharray="6 4" pointerEvents="none" />;
            })()}
          </svg>
        </div>

        {/* Estado y propiedades */}
        <div className="p-3 border-t border-slate-200 text-sm space-y-2">
          <p role="status" aria-live="polite" className="text-slate-700 min-h-5">{status || 'Haz clic en una entrada para encenderla o apagarla. Arrastra desde el círculo de salida de una compuerta hasta la entrada de otra para conectar.'}</p>
          {selectedNode && (
            <div className="flex flex-wrap items-end gap-3 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
              <strong>{NAMES[selectedNode.type]}</strong>
              {(selectedNode.type === 'INPUT' || selectedNode.type === 'OUTPUT') && !lockIO && (
                <label className="flex items-center gap-2">Nombre
                  <input value={selectedNode.label} maxLength={12} onChange={e => updateNode(selectedNode.id, { label: e.target.value })}
                    aria-invalid={!isValidLabel(selectedNode.label)} className="w-24 border border-slate-300 rounded px-2 py-1 font-mono bg-white" />
                </label>
              )}
              {['AND', 'OR', 'NAND', 'NOR'].includes(selectedNode.type) && (
                <label className="flex items-center gap-2">Entradas
                  <select value={pinCount(selectedNode)} onChange={e => updateNode(selectedNode.id, { pins: Number(e.target.value) })} className="border border-slate-300 rounded px-2 py-1 bg-white">
                    {[2, 3, 4].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
              )}
              <button onClick={deleteSelection} className="px-2 py-1 rounded border border-red-300 text-red-700 bg-white hover:bg-red-50">Eliminar</button>
            </div>
          )}
          {selected?.kind === 'wire' && <p className="text-indigo-800">Cable seleccionado. <button onClick={deleteSelection} className="underline">Eliminarlo</button></p>}
          {errors.length > 0 && circuit.nodes.length > 0 && (
            <ul className="text-amber-800 text-xs list-disc pl-5">{[...new Set(errors.map(e => e.text))].slice(0, 4).map(t => <li key={t}>{t}</li>)}</ul>
          )}
        </div>
      </div>

      {showBuilder && (
        <div className="order-3 xl:order-none xl:col-start-1 xl:row-start-2 min-w-0 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-60 text-sm font-medium text-slate-700">Construir desde una expresión (varias salidas separadas por «;»)
              <input value={exprText} onChange={e => setExprText(e.target.value)} onKeyDown={e => e.key === 'Enter' && buildFromText(exprText)}
                placeholder="Z = B + T'*S*(P+M)" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-slate-50" />
            </label>
            <button onClick={() => buildFromText(exprText)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Dibujar circuito</button>
            <button onClick={() => buildFromText(exprText, true)} className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-800 bg-indigo-50 hover:bg-indigo-100">Dibujar simplificado</button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs uppercase font-semibold text-slate-600">Ejemplos:</span>
            {EXAMPLES.map(ex => <button key={ex.label} onClick={() => { setExprText(ex.expr); buildFromText(ex.expr); }} className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200">{ex.label}</button>)}
          </div>
          <div className="flex flex-wrap gap-2 items-center border-t border-slate-200 pt-3">
            <span className="text-xs uppercase font-semibold text-slate-600">Transformar el circuito actual:</span>
            <button onClick={() => runTransform('simplify')} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Simplificar</button>
            <button onClick={() => runTransform('NAND')} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Solo NAND</button>
            <button onClick={() => runTransform('NOR')} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Solo NOR</button>
            <span className="text-xs text-slate-600">Se pueden deshacer.</span>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div className="order-2 xl:order-none xl:col-start-2 xl:row-start-1 xl:row-span-2 min-w-0 xl:sticky xl:top-4">
          <CircuitAnalysis circuit={circuit} inputValues={inputValues} onSetInputs={setInputValues} onHighlight={setHighlight} highlighted={highlight} />
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
      {icon}<span className="text-xs">{label}</span>
    </button>
  );
}
