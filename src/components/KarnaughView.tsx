import { useMemo } from 'react';
import type { QmResult } from '../logic/boolean';
import { buildKarnaugh } from '../logic/karnaugh';

export const GROUP_COLORS = ['#4f46e5', '#db2777', '#d97706', '#059669', '#0891b2', '#7c3aed', '#dc2626', '#65a30d'];

export function KarnaughView({ vars, minterms, qm }: { vars: string[]; minterms: number[]; qm?: QmResult }) {
  const k = useMemo(() => buildKarnaugh(vars, minterms, qm), [vars, minterms, qm]);
  if (!k) return <p className="text-sm text-slate-600">El mapa de Karnaugh se muestra para 1 a 5 variables (esta función tiene {vars.length}).</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-6">
        {k.maps.map((map, mi) => (
          <figure key={mi} className="m-0">
            {map.title && <figcaption className="text-xs font-semibold text-slate-600 mb-1">{map.title}</figcaption>}
            <table className="border-collapse text-center text-sm" aria-label={`Mapa de Karnaugh ${map.title}`}>
              <thead>
                <tr>
                  <th className="p-1 text-[11px] font-mono text-slate-600 border-b border-r border-slate-300">
                    {map.rowVars.join('') || '·'}\{map.colVars.join('') || '·'}
                  </th>
                  {map.colLabels.map(l => <th key={l} className="px-3 py-1 font-mono text-xs text-slate-600 border-b border-slate-300">{l || '·'}</th>)}
                </tr>
              </thead>
              <tbody>
                {map.cells.map((row, ri) => (
                  <tr key={ri}>
                    <th className="px-2 font-mono text-xs text-slate-600 border-r border-slate-300">{map.rowLabels[ri] || '·'}</th>
                    {row.map(cell => (
                      <td
                        key={cell.minterm}
                        title={`m${cell.minterm}`}
                        className="relative w-14 h-14 border border-slate-200 align-middle"
                        style={{ background: cell.groups.length ? `${GROUP_COLORS[cell.groups[0] % GROUP_COLORS.length]}1f` : undefined }}
                      >
                        <span className={`text-lg font-bold ${cell.value ? 'text-slate-900' : 'text-slate-600'}`}>{cell.value}</span>
                        <span className="absolute left-1 top-0 text-[9px] text-slate-600">{cell.minterm}</span>
                        <span className="absolute left-1 right-1 bottom-0.5 flex gap-0.5 justify-center">
                          {cell.groups.map(g => <i key={g} className="block h-1 flex-1 rounded" style={{ background: GROUP_COLORS[g % GROUP_COLORS.length] }} />)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </figure>
        ))}
      </div>
      {qm && <ul className="mt-3 flex flex-wrap gap-2 text-sm list-none p-0">
        {k.groups.length === 0 && <li className="text-slate-600">{minterms.length ? 'Sin grupos.' : 'La función vale 0 en todas las filas: no hay grupos.'}</li>}
        {k.groups.map((g, i) => (
          <li key={i} className="px-2 py-1 rounded border font-mono" style={{ borderColor: GROUP_COLORS[i % GROUP_COLORS.length], background: `${GROUP_COLORS[i % GROUP_COLORS.length]}14` }}>
            {g.term} <span className="text-slate-600 text-xs">({g.minterms.length} {g.minterms.length === 1 ? "celda" : "celdas"})</span>
          </li>
        ))}
      </ul>}
    </div>
  );
}
