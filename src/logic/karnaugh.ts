import type { QmResult } from './boolean';

/** Mapas de Karnaugh de 1 a 5 variables (5 variables = dos mapas de 4). */
export type KCell = { minterm: number; value: 0 | 1; groups: number[] };
export type KGroup = { term: string; minterms: number[] };
export type KMap = {
  title: string;
  rowVars: string[];
  colVars: string[];
  rowLabels: string[];
  colLabels: string[];
  cells: KCell[][];
};
export type KResult = { maps: KMap[]; groups: KGroup[] };

const gray = (bits: number): number[] => (bits === 0 ? [0] : bits === 1 ? [0, 1] : bits === 2 ? [0, 1, 3, 2] : [0]);
const bin = (n: number, bits: number) => (bits === 0 ? '' : n.toString(2).padStart(bits, '0'));

export const termMinterms = (term: { varIdx: number; isNot: boolean }[], numVars: number): number[] => {
  const result: number[] = [];
  for (let m = 0; m < 2 ** numVars; m++) {
    if (term.every(l => (((m >> (numVars - 1 - l.varIdx)) & 1) === 1) !== l.isNot)) result.push(m);
  }
  return result;
};

export const buildKarnaugh = (vars: string[], minterms: number[], qm?: QmResult): KResult | null => {
  const n = vars.length;
  if (n < 1 || n > 5) return null;
  const on = new Set(minterms);
  const groups: KGroup[] = [];
  if (qm && !qm.isOne && !qm.isZero) {
    for (const term of qm.terms) {
      groups.push({
        term: term.length ? term.map(l => vars[l.varIdx] + (l.isNot ? "'" : '')).join('·') : '1',
        minterms: termMinterms(term, n),
      });
    }
  } else if (qm?.isOne) groups.push({ term: '1', minterms: [...on] });

  const split = n === 5 ? 1 : 0;
  const local = n - split;
  const rowBits = Math.floor(local / 2);
  const colBits = local - rowBits;
  const rowVars = vars.slice(split, split + rowBits);
  const colVars = vars.slice(split + rowBits);
  const rows = gray(rowBits);
  const cols = gray(colBits);
  const maps: KMap[] = [];
  for (let s = 0; s < 1 << split; s++) {
    const cells = rows.map(r => cols.map(c => {
      const minterm = (s << local) | (r << colBits) | c;
      return { minterm, value: (on.has(minterm) ? 1 : 0) as 0 | 1, groups: groups.flatMap((g, gi) => (g.minterms.includes(minterm) ? [gi] : [])) };
    }));
    maps.push({
      title: split ? `${vars[0]} = ${s}` : '',
      rowVars, colVars,
      rowLabels: rows.map(r => bin(r, rowBits)),
      colLabels: cols.map(c => bin(c, colBits)),
      cells,
    });
  }
  return { maps, groups };
};
