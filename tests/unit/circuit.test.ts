import { describe, expect, it } from 'vitest';
import {
  analyzeOutput, autoLayout, canConnect, checkCircuit, circuitCost, circuitFromExpressions, circuitIssues,
  circuitPaths, connect, emptyCircuit, makeNode, parseCircuit, serializeCircuit, simulate, toAst, toUniversal, type Circuit,
} from '../../src/logic/circuit';
import { buildKarnaugh } from '../../src/logic/karnaugh';
import { quineMcCluskey } from '../../src/logic/boolean';

const ALARM = 'Z = B + !T*S*(P+M)';
const outId = (c: Circuit) => c.nodes.find(n => n.type === 'OUTPUT')!.id;

describe('modelo de circuito', () => {
  it('construye la alarma desde su expresión y su tabla coincide', () => {
    const c = circuitFromExpressions(ALARM);
    expect(circuitIssues(c).filter(i => i.level === 'error')).toEqual([]);
    const a = analyzeOutput(c, outId(c))!;
    expect(a.vars).toEqual(['B', 'M', 'P', 'S', 'T']);
    expect(a.rows).toHaveLength(32);
    const row = a.rows.find(r => r.env.P === 1 && r.env.S === 1 && r.env.T === 0 && r.env.M === 0 && r.env.B === 0)!;
    expect(row.result).toBe(1);
    expect(a.rows.find(r => r.env.T === 1 && r.env.S === 1 && r.env.P === 1 && r.env.B === 0)!.result).toBe(0);
  });

  it('simplificar conserva la función y no aumenta compuertas', () => {
    const raw = circuitFromExpressions('F = (A+B)*(A+B\')*(C+A)');
    const simple = circuitFromExpressions('F = (A+B)*(A+B\')*(C+A)', true);
    expect(checkCircuit(simple, [{ name: 'F', expr: "(A+B)*(A+B')*(C+A)" }]).ok).toBe(true);
    expect(analyzeOutput(raw, outId(raw))!.sop).toBe('A');
    expect(circuitCost(simple).gates).toBeLessThan(circuitCost(raw).gates);
  });

  it.each(['NAND', 'NOR'] as const)('convierte a solo %s sin cambiar la función', style => {
    for (const expr of [ALARM, 'F = A^B^C', 'F = !(A*B) + C*D', 'F = A XOR B; G = A*B']) {
      const c = circuitFromExpressions(expr);
      const u = toUniversal(c, style);
      expect(u.nodes.filter(n => n.type !== 'INPUT' && n.type !== 'OUTPUT').every(n => n.type === style)).toBe(true);
      for (const o of c.nodes.filter(n => n.type === 'OUTPUT')) {
        const o2 = u.nodes.find(n => n.type === 'OUTPUT' && n.label === o.label)!;
        expect(analyzeOutput(u, o2.id)!.minterms).toEqual(analyzeOutput(c, o.id)!.minterms);
      }
    }
  });

  it('medio sumador en NAND usa 5 compuertas', () => {
    const c = toUniversal(circuitFromExpressions('S = A^B; C = A*B'), 'NAND');
    expect(circuitCost(c).gates).toBe(5);
  });

  it('rechaza ciclos y reemplaza cables en el mismo pin', () => {
    let c = emptyCircuit();
    const a = makeNode(c, 'INPUT', 0, 0); c = { ...c, nodes: [a] };
    const g1 = makeNode(c, 'NOT', 100, 0); const g2 = makeNode(c, 'NOT', 200, 0);
    c = { ...c, nodes: [a, g1, g2] };
    c = connect(c, a.id, g1.id, 0); c = connect(c, g1.id, g2.id, 0);
    expect(canConnect(c, g2.id, g1.id, 0)).toBe(false);
    c = connect(c, a.id, g2.id, 0);
    expect(c.wires.filter(w => w.to === g2.id)).toHaveLength(1);
  });

  it('calcula caminos y retardo', () => {
    const c = circuitFromExpressions('F = A*B + C');
    const p = circuitPaths(c, outId(c));
    expect(p.total).toBe(3);
    expect(p.depth).toBe(2);
    expect(p.paths[0].gates).toBe(2);
  });

  it('verifica circuitos contra una especificación', () => {
    const good = circuitFromExpressions('S = A^B; C = A*B');
    expect(checkCircuit(good, [{ name: 'S', expr: 'A^B' }, { name: 'C', expr: 'A*B' }]).ok).toBe(true);
    const bad = circuitFromExpressions('S = A+B; C = A*B');
    const r = checkCircuit(bad, [{ name: 'S', expr: 'A^B' }, { name: 'C', expr: 'A*B' }]);
    expect(r.ok).toBe(false);
    expect(r.mismatches[0].output).toBe('S');
    expect(checkCircuit(good, [{ name: 'S', expr: 'A^B' }], { allowed: ['NAND'] }).ok).toBe(false);
  });

  it('exporta e importa JSON y simula valores', () => {
    const c = autoLayout(circuitFromExpressions('F = A*B'));
    const back = parseCircuit(serializeCircuit(c));
    const a = back.nodes.find(n => n.label === 'A')!.id; const b = back.nodes.find(n => n.label === 'B')!.id;
    expect(simulate(back, { [a]: 1, [b]: 1 }).get(outId(back))).toBe(1);
    expect(simulate(back, { [a]: 1, [b]: 0 }).get(outId(back))).toBe(0);
    expect(toAst(back, outId(back))).not.toBeNull();
  });
});

describe('límites de rendimiento del análisis', () => {
  it('omite la simplificación cuando se pide o hay demasiadas entradas, pero conserva la tabla', () => {
    const c = circuitFromExpressions('F = A*B + C');
    const fast = analyzeOutput(c, outId(c), { simplify: false })!;
    expect(fast.simplified).toBe(false);
    expect(fast.sop).toBe('');
    expect(fast.rows).toHaveLength(8);
    expect(analyzeOutput(c, outId(c))!.simplified).toBe(true);

    const vars = 'ABCDEFGHIJK'.split(''); // 11 entradas > SIMPLIFY_LIMIT
    const big = circuitFromExpressions(`F = ${vars.join('^')}`);
    const t = performance.now();
    const a = analyzeOutput(big, outId(big))!;
    expect(a.simplified).toBe(false);
    expect(a.rows).toHaveLength(2048);
    expect(a.minterms).toHaveLength(1024); // paridad: la mitad de las filas
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe('acomodo automático', () => {
  it.each(["Z = B + !T*S*(P+M)", 'S = A^B; C = A*B', 'F = A'])('no apila nodos y respeta el orden izquierda → derecha: %s', expr => {
    for (const c of [circuitFromExpressions(expr), toUniversal(circuitFromExpressions(expr), 'NAND')]) {
      const spots = c.nodes.map(n => `${n.x},${n.y}`);
      expect(new Set(spots).size).toBe(spots.length);
      for (const w of c.wires) {
        const a = c.nodes.find(n => n.id === w.from)!; const b = c.nodes.find(n => n.id === w.to)!;
        expect(a.x).toBeLessThan(b.x);
      }
      for (const n of c.nodes.filter(n => n.type === 'INPUT')) expect(n.x).toBe(30);
    }
  });
});

describe('Karnaugh', () => {
  it('ubica minterms en orden Gray y asocia grupos', () => {
    const qm = quineMcCluskey([0, 1, 2, 3, 6, 7], 3);
    const k = buildKarnaugh(['A', 'B', 'C'], [0, 1, 2, 3, 6, 7], qm)!;
    expect(k.maps).toHaveLength(1);
    expect(k.maps[0].colLabels).toEqual(['00', '01', '11', '10']);
    expect(k.maps[0].cells.flat().filter(c => c.value === 1)).toHaveLength(6);
    expect(k.groups.map(g => g.term).sort()).toEqual(["A'", 'B']);
  });
  it('5 variables usa dos mapas', () => {
    expect(buildKarnaugh(['A', 'B', 'C', 'D', 'E'], [0], quineMcCluskey([0], 5))!.maps).toHaveLength(2);
    expect(buildKarnaugh(['A', 'B', 'C', 'D', 'E', 'F'], [], undefined)).toBeNull();
  });
});
