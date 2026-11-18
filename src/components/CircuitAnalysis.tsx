import { useMemo, useState } from 'react';
import { calculateExpression, quineMcCluskey, type Bit } from '../logic/boolean';
import {
  SIMPLIFY_LIMIT, analyzeOutput, circuitCost, circuitFromExpressions, circuitPaths, toUniversal,
  type Circuit, type CircuitCost, type CNode,
} from '../logic/circuit';
import { KarnaughView } from './KarnaughView';

type Props = {
  circuit: Circuit;
  inputValues: Record<string, Bit>;
  onSetInputs: (values: Record<string, Bit>) => void;
  onHighlight: (nodes: string[] | null) => void;
  highlighted: string[] | null;
};

const TABS = [
  { id: 'truth', label: 'Tabla de verdad' },
  { id: 'expr', label: 'Expresión' },
  { id: 'karnaugh', label: 'Karnaugh' },
  { id: 'paths', label: 'Caminos' },
  { id: 'cost', label: 'Costo y chips' },
] as const;

const typeName = (n?: CNode) => (n ? (n.type === 'INPUT' || n.type === 'OUTPUT' ? n.label : n.type) : '?');

const costRow = (name: string, cost: CircuitCost, base: CircuitCost) => (
  <tr key={name} className="border-t border-slate-200">
    <th scope="row" className="text-left py-1.5 pr-3 font-medium">{name}</th>
    <td className="px-3 text-right tabular-nums">{cost.gates}</td>
    <td className="px-3 text-right tabular-nums">{cost.gateInputs}</td>
    <td className="px-3 text-right tabular-nums">{cost.chips}</td>
    <td className="pl-3 text-right text-xs text-slate-600">
      {cost === base ? '—' : cost.gates === base.gates ? 'igual' : `${cost.gates < base.gates ? '−' : '+'}${Math.abs(cost.gates - base.gates)} compuertas`}
    </td>
  </tr>
);

export function CircuitAnalysis({ circuit, inputValues, onSetInputs, onHighlight, highlighted }: Props) {
  const outputs = circuit.nodes.filter(n => n.type === 'OUTPUT').sort((a, b) => (a.label < b.label ? -1 : 1));
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('truth');
  const [selected, setSelected] = useState<string>('');
  const outId = outputs.find(o => o.id === selected)?.id ?? outputs[0]?.id;
  // El análisis no depende de las posiciones: mover compuertas no debe recalcularlo.
  const structKey = JSON.stringify([circuit.nodes.map(n => [n.id, n.type, n.label, n.pins]), circuit.wires.map(w => [w.from, w.to, w.pin])]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => circuit, [structKey]);
  // La simplificación (Quine-McCluskey) es la parte costosa: solo se calcula en las vistas que la usan.
  const needsSimplify = tab === 'expr' || tab === 'karnaugh' || tab === 'cost';
  const analysis = useMemo(() => (outId ? analyzeOutput(stable, outId, { simplify: needsSimplify }) : null), [stable, outId, needsSimplify]);
  const inputsByLabel = useMemo(() => new Map(circuit.nodes.filter(n => n.type === 'INPUT').map(n => [n.label, n.id])), [circuit]);
  const paths = useMemo(() => (outId && analysis?.complete ? circuitPaths(stable, outId) : null), [stable, outId, analysis]);
  const byId = useMemo(() => new Map(circuit.nodes.map(n => [n.id, n])), [circuit]);

  const steps = useMemo(() => {
    if (tab !== 'expr' || !analysis?.expression || analysis.vars.length > 6) return [];
    try { return calculateExpression(analysis.expression).steps; } catch { return []; }
  }, [tab, analysis]);

  const qm = useMemo(() => (analysis && analysis.simplified ? quineMcCluskey(analysis.minterms, analysis.vars.length) : undefined), [analysis]);

  const costs = useMemo(() => {
    if (tab !== 'cost' || !analysis?.complete || analysis.tooBig || analysis.vars.length > 8) return null;
    try {
      const all = outputs.map(o => analyzeOutput(stable, o.id));
      if (!all.every(a => a?.complete && a.simplified)) return null;
      const simplified = circuitFromExpressions(outputs.map((o, i) => `${o.label} = ${all[i]!.sop}`).join('; '));
      return {
        actual: circuitCost(stable),
        simplified: circuitCost(simplified),
        nand: circuitCost(toUniversal(simplified, 'NAND')),
        nor: circuitCost(toUniversal(simplified, 'NOR')),
      };
    } catch { return null; }
  }, [tab, stable, analysis, outputs]);

  if (!outputs.length) return <p className="text-sm text-slate-600 p-4">Agrega una salida y conéctala para ver el análisis del circuito.</p>;

  const currentRow = analysis ? analysis.rows.findIndex(r => analysis.vars.every(v => (inputValues[inputsByLabel.get(v)!] ?? 0) === r.env[v])) : -1;
  const MAX_ROWS = 256;

  return (
    <section aria-label="Análisis del circuito" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 pr-3">
        <div role="tablist" aria-label="Vistas de análisis" className="flex overflow-x-auto flex-1">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {outputs.length > 1 && (
          <label className="text-sm text-slate-700 flex items-center gap-2">Salida
            <select value={outId} onChange={e => { setSelected(e.target.value); onHighlight(null); }} className="border border-slate-300 rounded px-2 py-1 bg-white">
              {outputs.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div role="tabpanel" className="p-4">
        {!analysis?.complete && <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">Conecta todas las entradas de las compuertas y la salida {analysis?.node.label} para ver su análisis.</p>}
        {analysis?.complete && analysis.tooBig && <p className="text-sm text-slate-700">Esta salida depende de {analysis.vars.length} entradas; el análisis completo admite hasta 12.</p>}

        {analysis?.complete && !analysis.tooBig && tab === 'truth' && (
          <div>
            <p className="text-xs text-slate-600 mb-2">Haz clic en una fila para poner esas entradas en el circuito. La fila activa se resalta.</p>
            <div className="max-h-80 overflow-auto border border-slate-200 rounded">
              <table className="w-full text-sm font-mono text-center">
                <thead className="bg-slate-100 sticky top-0"><tr>
                  <th scope="col" className="px-2 py-1 text-slate-600">#</th>
                  {analysis.vars.map(v => <th scope="col" key={v} className="px-3 py-1">{v}</th>)}
                  <th scope="col" className="px-3 py-1 bg-indigo-50 text-indigo-800">{analysis.node.label}</th>
                </tr></thead>
                <tbody>
                  {analysis.rows.slice(0, MAX_ROWS).map((r, i) => (
                    <tr key={i} tabIndex={0} aria-selected={i === currentRow}
                      onClick={() => onSetInputs(Object.fromEntries(analysis.vars.map(v => [inputsByLabel.get(v)!, r.env[v] as Bit])))}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                      className={`cursor-pointer border-t border-slate-100 ${i === currentRow ? 'bg-amber-200 font-bold' : 'hover:bg-slate-50'}`}>
                      <td className="px-2 text-slate-600">{i}</td>
                      {analysis.vars.map(v => <td key={v}>{r.env[v]}</td>)}
                      <td className={`font-bold ${r.result ? 'text-green-700 bg-green-50' : 'text-slate-600'}`}>{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analysis.rows.length > MAX_ROWS && <p className="text-xs text-slate-600 mt-1">Se muestran las primeras {MAX_ROWS} de {analysis.rows.length} filas.</p>}
          </div>
        )}

        {analysis?.complete && !analysis.tooBig && needsSimplify && !analysis.simplified && (
          <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3 mb-3">
            Esta salida depende de {analysis.vars.length} entradas. La simplificación exacta en el editor se limita a {SIMPLIFY_LIMIT} (el cálculo crece muy rápido); la tabla de verdad, los caminos y la simulación sí funcionan.
            {analysis.expression && <span className="block font-mono mt-2 break-words text-slate-800">{analysis.node.label} = {analysis.expression}</span>}
          </p>
        )}

        {analysis?.complete && !analysis.tooBig && analysis.simplified && tab === 'expr' && (
          <div className="space-y-3 text-sm">
          <dl className="space-y-3 m-0">
            {([
              ['Expresión del circuito', analysis.expression ?? 'Demasiado larga para mostrarla'],
              ['Simplificada (SOP)', `${analysis.node.label} = ${analysis.sop}`],
              ['Simplificada (POS)', `${analysis.node.label} = ${analysis.pos}`],
              ['Solo NAND', analysis.nand],
              ['Solo NOR', analysis.nor],
              ['Minterms', `Σ m(${analysis.minterms.join(', ')})`],
            ] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs uppercase font-semibold text-slate-600">{k}</dt>
                <dd className="m-0 font-mono bg-slate-50 border border-slate-200 rounded px-3 py-2 break-words">{v}</dd></div>
            ))}
          </dl>
            {steps.length > 0 && (
              <details className="border border-slate-200 rounded p-3">
                <summary className="cursor-pointer font-medium">Procedimiento de simplificación ({steps.length} pasos)</summary>
                <ol className="mt-2 space-y-2 list-decimal pl-5">
                  {steps.map(s => (
                    <li key={s.index}><div className="font-mono">{s.after}</div>
                      <div className="text-xs text-slate-600"><strong>{s.law}.</strong> {s.explanation}</div></li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}

        {analysis?.complete && !analysis.tooBig && analysis.simplified && tab === 'karnaugh' && <KarnaughView vars={analysis.vars} minterms={analysis.minterms} qm={qm} />}

        {analysis?.complete && tab === 'paths' && paths && (
          <div>
            <p className="text-sm mb-2"><strong>{paths.total}</strong> camino{paths.total === 1 ? '' : 's'} hasta {analysis.node.label}. Retardo máximo: <strong>{paths.depth}</strong> nivel{paths.depth === 1 ? '' : 'es'} de compuertas.</p>
            <ul className="space-y-1 list-none p-0 max-h-72 overflow-auto">
              {paths.paths.slice(0, 60).map((p, i) => {
                const active = highlighted && highlighted.join() === p.nodes.join();
                return (
                  <li key={i}>
                    <button aria-pressed={Boolean(active)} onClick={() => onHighlight(active ? null : p.nodes)}
                      className={`w-full text-left text-sm font-mono px-3 py-1.5 rounded border ${active ? 'bg-orange-100 border-orange-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {p.nodes.map(id => typeName(byId.get(id))).join(' → ')}
                      <span className="text-xs text-slate-600 font-sans"> · {p.gates} compuerta{p.gates === 1 ? '' : 's'}{p.gates === paths.depth ? ' · crítico' : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {paths.truncated && <p className="text-xs text-slate-600 mt-1">Hay más caminos de los que se listan.</p>}
          </div>
        )}

        {tab === 'cost' && (
          <div className="space-y-4">
            {costs ? (
              <>
                <table className="text-sm w-full max-w-xl">
                  <thead><tr className="text-xs uppercase text-slate-600 text-right">
                    <th className="text-left pr-3">Versión</th><th className="px-3">Compuertas</th><th className="px-3">Entradas</th><th className="px-3">Chips</th><th className="pl-3">vs. actual</th></tr></thead>
                  <tbody>
                    {costRow('Circuito actual', costs.actual, costs.actual)}
                    {costRow('Simplificado (SOP)', costs.simplified, costs.actual)}
                    {costRow('Simplificado solo NAND', costs.nand, costs.actual)}
                    {costRow('Simplificado solo NOR', costs.nor, costs.actual)}
                  </tbody>
                </table>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Circuitos integrados del circuito actual</h3>
                  <table className="text-sm"><thead><tr className="text-xs uppercase text-slate-600 text-left"><th className="pr-4">Compuerta</th><th className="pr-4">Cantidad</th><th className="pr-4">Chip</th><th>Chips</th></tr></thead>
                    <tbody>{costs.actual.rows.map(r => (
                      <tr key={`${r.gate}${r.pins}`} className="border-t border-slate-200"><td className="pr-4 py-1">{r.gate}{r.pins > 1 ? ` de ${r.pins} entradas` : ''}</td><td>{r.count}</td><td className="pr-4 font-mono">{r.chip}</td><td>{r.chips}</td></tr>
                    ))}</tbody></table>
                </div>
                <p className="text-xs text-slate-600">Estimación con la familia 74xx/4000 más común (p. ej. el 7400 trae 4 NAND de 2 entradas). Los chips con compuertas sin usar no se aprovechan entre tipos distintos.</p>
              </>
            ) : <p className="text-sm text-slate-600">Conecta el circuito (hasta 8 entradas) para comparar costos.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

