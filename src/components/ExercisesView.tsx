import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, Dices, Lightbulb, PartyPopper } from 'lucide-react';
import type { Bit } from '../logic/boolean';
import { checkCircuit, circuitIssues, type Circuit, type CNode } from '../logic/circuit';
import {
  EXERCISES, KIND_LABEL, checkExpressionAnswer, checkTruthAnswer, generateRandomExercise, truthRows,
  type Exercise, type Verdict,
} from '../logic/exercises';
import { CircuitEditor } from './CircuitEditor';
import { KarnaughView } from './KarnaughView';
import { PATH_ORDER, UNITS, nextAfter, nextRecommended, unitOf, unitProgress, unitStatus } from '../logic/path';
import { Badge, Button } from './ui';

const PROGRESS_KEY = 'logiclab.progress.v1';
const loadProgress = (): string[] => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]'); } catch { return []; } };
const saveProgress = (ids: string[]) => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids)); } catch { /* sin almacenamiento */ } };

const LEVELS = ['', 'Básico', 'Intermedio', 'Avanzado'];

/** Circuito inicial de un ejercicio: entradas a la izquierda y salidas a la derecha. */
const startingCircuit = (ex: Exercise): Circuit => {
  const nodes: CNode[] = [];
  ex.vars.forEach((v, i) => nodes.push({ id: `in-${v.name}`, type: 'INPUT', x: 30, y: 30 + i * 70, label: v.name, pins: 0 }));
  ex.outputs.forEach((o, i) => nodes.push({ id: `out-${o.name}`, type: 'OUTPUT', x: 720, y: 60 + i * 80, label: o.name, pins: 1 }));
  return { nodes, wires: [] };
};

const VerdictBox = ({ v }: { v: Verdict | null }) => !v ? null : (
  <p role="status" className={`mt-3 p-3 rounded-lg border text-sm ${v.status === 'ok' ? 'bg-green-50 border-green-300 text-green-900' : v.status === 'partial' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
    {v.message}
  </p>
);

function TruthExercise({ ex, onVerdict }: { ex: Exercise; onVerdict: (v: Verdict) => void }) {
  const { vars, rows } = useMemo(() => truthRows(ex), [ex]);
  const [answers, setAnswers] = useState<(Bit | null)[]>(() => rows.map(() => null));
  const cycle = (i: number) => setAnswers(a => a.map((x, j) => (j === i ? (x === null ? 1 : x === 1 ? 0 : 1) : x)));
  return (
    <div>
      <p className="text-xs text-slate-600 mb-2">Haz clic en la celda de salida para alternar entre 1 y 0.</p>
      <table className="text-sm font-mono text-center border border-slate-200">
        <thead className="bg-slate-100"><tr>{vars.map(v => <th scope="col" key={v} className="px-4 py-1">{v}</th>)}<th scope="col" className="px-4 py-1 bg-indigo-50 text-indigo-800">{ex.outputs[0].name}</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-100">
            {vars.map(v => <td key={v}>{r.env[v]}</td>)}
            <td>
              <button onClick={() => cycle(i)} aria-label={`Salida de la fila ${i}: ${answers[i] ?? 'sin responder'}`}
                className={`w-12 py-1 font-bold rounded ${answers[i] === null ? 'bg-slate-100 text-slate-600' : answers[i] ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                {answers[i] ?? '?'}
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      <button onClick={() => onVerdict(checkTruthAnswer(ex, answers))} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Comprobar</button>
    </div>
  );
}

function ExpressionExercise({ ex, onVerdict }: { ex: Exercise; onVerdict: (v: Verdict) => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const insert = (s: string) => { setText(t => t + s); ref.current?.focus(); };
  const tokens = [...ex.vars.map(v => v.name), "'", '*', '+', '^', '(', ')'];
  const [showMap, setShowMap] = useState(false);
  const { vars, rows } = useMemo(() => truthRows(ex), [ex]);
  const minterms = useMemo(() => rows.flatMap((r, i) => (r.expected ? [i] : [])), [rows]);
  return (
    <div>
      {ex.start && <p className="mb-3">Expresión dada: <code className="px-2 py-1 bg-slate-100 rounded font-mono break-words">F = {ex.start}</code></p>}
      <label htmlFor="ex-answer" className="block text-sm font-medium text-slate-700 mb-1">Tu respuesta</label>
      <div className="flex flex-wrap gap-2">
        <input id="ex-answer" ref={ref} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && onVerdict(checkExpressionAnswer(ex, text))}
          placeholder="Z = B + T'*S*(P+M)" className="flex-1 min-w-52 px-3 py-2 border border-slate-300 rounded-lg font-mono bg-slate-50" />
        <button onClick={() => onVerdict(checkExpressionAnswer(ex, text))} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Comprobar</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Teclado de símbolos">
        {tokens.map(t => <button key={t} onClick={() => insert(t)} aria-label={`Insertar ${t}`} className="min-w-9 h-9 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 font-mono">{t}</button>)}
        <button onClick={() => setText(t => t.slice(0, -1))} className="px-2 h-9 rounded border border-slate-300 bg-slate-100 hover:bg-slate-200">⌫</button>
      </div>
      {(ex.kind === 'simplify' || vars.length <= 4) && (
        <div className="mt-4">
          <button onClick={() => setShowMap(s => !s)} aria-expanded={showMap} className="text-sm text-indigo-700 underline">{showMap ? 'Ocultar' : 'Mostrar'} mapa de Karnaugh (sin grupos)</button>
          {showMap && <div className="mt-2"><KarnaughView vars={vars} minterms={minterms} /></div>}
        </div>
      )}
    </div>
  );
}

function CircuitExercise({ ex, onVerdict }: { ex: Exercise; onVerdict: (v: Verdict) => void }) {
  const latest = useRef<Circuit>(startingCircuit(ex));
  const initial = useMemo(() => startingCircuit(ex), [ex]);
  const onChange = useCallback((c: Circuit) => { latest.current = c; }, []);
  const check = () => {
    const c = latest.current;
    const open = circuitIssues(c).filter(i => i.level === 'error');
    const r = checkCircuit(c, ex.outputs, { allowed: ex.allowedGates, maxGates: ex.maxGates });
    if (r.ok) { onVerdict({ status: 'ok', message: `¡Correcto! Tu circuito cumple la función con ${r.gates} compuerta${r.gates === 1 ? '' : 's'}.` }); return; }
    const m = r.mismatches[0];
    const parts = [...r.messages];
    if (m) parts.push(`La salida ${m.output} falla con ${Object.entries(m.env).map(([k, v]) => `${k}=${v}`).join(', ')}: da ${m.got ?? 'sin valor (cable sin conectar)'} y debería dar ${m.expected}.`);
    if (!parts.length && open.length) parts.push(open[0].text);
    onVerdict({ status: 'wrong', message: parts.join(' ') });
  };
  return (
    <div>
      <CircuitEditor key={ex.id} initial={initial} storageKey={`logiclab.ex.${ex.id}`} lockIO allowedGates={ex.allowedGates} showBuilder={false} showAnalysis={false} height={360} onChange={onChange} />
      <button onClick={check} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Comprobar circuito</button>
    </div>
  );
}

const STATUS_LABEL = { done: 'Completada', current: 'En curso', upcoming: 'Pendiente' } as const;

export function ExercisesView() {
  const [custom, setCustom] = useState<Exercise[]>([]);
  const all = useMemo(() => [...EXERCISES, ...custom], [custom]);
  const [solved, setSolved] = useState<string[]>(loadProgress);
  const [currentId, setCurrentId] = useState<string>(() => nextRecommended(loadProgress()) ?? EXERCISES[0].id);
  const [open, setOpen] = useState<Set<string>>(() => new Set([unitOf(nextRecommended(loadProgress()) ?? '')?.id ?? UNITS[0].id]));
  const [hints, setHints] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [randVars, setRandVars] = useState(3);

  const ex = all.find(e => e.id === currentId) ?? all[0];
  const exUnit = unitOf(ex.id);
  const exIndex = exUnit ? UNITS.indexOf(exUnit) + 1 : 0;

  const select = (id: string) => {
    setCurrentId(id); setHints(0); setVerdict(null); setRevealed(false);
    const u = unitOf(id);
    if (u) setOpen(o => new Set(o).add(u.id));
  };
  const toggleUnit = (id: string) => setOpen(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const onVerdict = (v: Verdict) => {
    setVerdict(v);
    if (v.status === 'ok' && !revealed && !solved.includes(ex.id)) { const next = [...solved, ex.id]; setSolved(next); saveProgress(next); }
  };
  const generate = () => { const e = generateRandomExercise(Date.now(), randVars); setCustom(c => [...c.slice(-4), e]); select(e.id); };

  const done = PATH_ORDER.filter(id => solved.includes(id)).length;
  const recommended = nextRecommended(solved);
  const recommendedEx = recommended ? EXERCISES.find(e => e.id === recommended) : undefined;
  const upNext = nextAfter(ex.id, solved);
  const upNextEx = upNext ? EXERCISES.find(e => e.id === upNext) : undefined;
  const justSolved = verdict?.status === 'ok' && solved.includes(ex.id);
  const unitDone = exUnit ? unitProgress(exUnit, solved).done === exUnit.exercises.length : false;

  return (
    <div className="grid lg:grid-cols-[19rem_1fr] gap-6 items-start">
      <aside aria-label="Ruta de aprendizaje" className="bg-white rounded-xl border border-slate-200 p-4 lg:sticky lg:top-16">
        <h2 className="font-semibold mb-1">Ruta de aprendizaje</h2>
        <p className="text-xs text-slate-600 mb-2">{done} de {PATH_ORDER.length} resueltos · se guarda en este navegador</p>
        <div className="h-1.5 bg-slate-200 rounded mb-3" role="progressbar" aria-label="Progreso total" aria-valuemin={0} aria-valuemax={PATH_ORDER.length} aria-valuenow={done}>
          <div className="h-full bg-green-500 rounded" style={{ width: `${(done / PATH_ORDER.length) * 100}%` }} />
        </div>
        {recommendedEx
          ? <Button className="w-full mb-3" onClick={() => select(recommendedEx.id)}>{done ? 'Continuar' : 'Empezar'}: {recommendedEx.title}</Button>
          : <p role="status" className="mb-3 p-2 rounded-lg bg-green-50 border border-green-300 text-sm text-green-900">¡Completaste toda la ruta! Practica sin límite con los ejercicios aleatorios.</p>}

        <ol className="space-y-2 list-none p-0 max-h-[26rem] overflow-auto pr-1">
          {UNITS.map((u, ui) => {
            const p = unitProgress(u, solved);
            const status = unitStatus(u, solved);
            const expanded = open.has(u.id);
            return (
              <li key={u.id} className={`rounded-lg border ${status === 'current' ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200'}`}>
                <button onClick={() => toggleUnit(u.id)} aria-expanded={expanded} aria-controls={`unit-${u.id}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left">
                  <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${status === 'done' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-800'}`} aria-hidden="true">{status === 'done' ? '✓' : ui + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink leading-tight">{u.title}</span>
                    <span className="block text-xs text-slate-600">{p.done}/{p.total} · {STATUS_LABEL[status]}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {expanded && (
                  <div id={`unit-${u.id}`} className="px-3 pb-3">
                    <p className="text-xs text-slate-700 mb-2">{u.summary}</p>
                    <ul className="space-y-1 list-none p-0">
                      {u.exercises.map(id => {
                        const e = EXERCISES.find(x => x.id === id)!;
                        return (
                          <li key={id}>
                            <button onClick={() => select(id)} aria-current={id === ex.id} className={`w-full text-left px-2 py-1.5 rounded-lg flex items-start gap-2 text-sm ${id === ex.id ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-slate-50 border border-transparent'}`}>
                              {solved.includes(id) ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" aria-label="Resuelto" /> : <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" aria-label="Pendiente" />}
                              <span><span className="font-medium">{e.title}</span><br /><span className="text-xs text-slate-600">{LEVELS[e.level]} · {e.topic}</span></span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-xs text-slate-700 mt-2">{u.tip.text} <a href={u.tip.href} className="underline text-brand-700">{u.tip.label}</a></p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {custom.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase text-slate-600 mb-1">Práctica libre</h3>
            <ul className="space-y-1 list-none p-0">
              {custom.map(e => (
                <li key={e.id}><button onClick={() => select(e.id)} aria-current={e.id === ex.id} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${e.id === ex.id ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-slate-50 border border-transparent'}`}>{e.title}<span className="block text-xs text-slate-600">{LEVELS[e.level]}</span></button></li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200">
          <label className="text-xs font-semibold uppercase text-slate-600 block mb-1" htmlFor="rand-vars">Ejercicio aleatorio</label>
          <div className="flex gap-2">
            <select id="rand-vars" value={randVars} onChange={e => setRandVars(Number(e.target.value))} className="border border-slate-300 rounded px-2 py-1 bg-white text-sm">
              {[3, 4, 5].map(n => <option key={n} value={n}>{n} variables</option>)}
            </select>
            <button onClick={generate} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-sm"><Dices className="w-4 h-4" /> Generar</button>
          </div>
        </div>
      </aside>

      <article className="bg-white rounded-xl border border-slate-200 p-5 min-w-0" aria-labelledby="ex-title">
        <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
          {exUnit && <Badge tone="neutral">Unidad {exIndex} · {exUnit.title}</Badge>}
          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">{KIND_LABEL[ex.kind]}</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{LEVELS[ex.level]}</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{ex.topic}</span>
        </div>
        <h2 id="ex-title" className="text-xl font-bold mb-2">{ex.title}</h2>
        <p className="text-slate-800 mb-3">{ex.statement}</p>
        {ex.vars.some(v => v.desc) && (
          <table className="text-sm mb-4"><caption className="sr-only">Variables del problema</caption>
            <tbody>{ex.vars.map(v => <tr key={v.name}><th scope="row" className="pr-3 font-mono text-left">{v.name}</th><td className="text-slate-700">{v.desc}</td></tr>)}</tbody></table>
        )}
        {(ex.allowedGates || ex.maxGates) && (
          <p className="text-sm mb-3 p-2 rounded bg-amber-50 border border-amber-200">Restricciones:{ex.allowedGates ? ` solo ${ex.allowedGates.join(', ')}.` : ''}{ex.maxGates ? ` Máximo ${ex.maxGates} compuertas.` : ''}</p>
        )}

        {ex.kind === 'truth' ? <TruthExercise key={ex.id} ex={ex} onVerdict={onVerdict} />
          : ex.kind === 'circuit' ? <CircuitExercise key={ex.id} ex={ex} onVerdict={onVerdict} />
          : <ExpressionExercise key={ex.id} ex={ex} onVerdict={onVerdict} />}

        <VerdictBox v={verdict} />

        {justSolved && (
          <section className="mt-3 p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm" aria-label="Siguiente paso">
            {unitDone && exUnit && (
              <p className="flex items-center gap-2 font-semibold text-brand-900 mb-2"><PartyPopper className="w-4 h-4" aria-hidden="true" />¡Unidad completada: {exUnit.title}!</p>
            )}
            {upNextEx
              ? <Button onClick={() => select(upNextEx.id)}>Siguiente: {upNextEx.title} →</Button>
              : <p className="text-brand-900">{done === PATH_ORDER.length ? '¡Terminaste toda la ruta!' : 'No quedan más ejercicios por resolver en la ruta.'}</p>}
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={hints >= ex.hints.length} onClick={() => setHints(h => h + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40">
            <Lightbulb className="w-4 h-4" /> Pista ({hints}/{ex.hints.length})
          </button>
          <button onClick={() => { if (revealed || confirm('Si ves la solución, el ejercicio ya no contará como resuelto. ¿Continuar?')) setRevealed(true); }} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Ver solución</button>
        </div>
        {hints > 0 && <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm text-slate-800">{ex.hints.slice(0, hints).map((h, i) => <li key={i}>{h}</li>)}</ol>}
        {revealed && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
            <p className="font-semibold mb-1">Solución</p>
            {ex.outputs.map(o => <p key={o.name} className="font-mono">{o.name} = {o.expr}</p>)}
            <p className="mt-2 text-slate-700">{ex.explanation}</p>
          </div>
        )}
      </article>
    </div>
  );
}
