import { describe, expect, it } from 'vitest';
import { TUTORIAL_STEPS } from '../../src/logic/tutorial';
import { circuitFromExpressions, emptyCircuit, makeNode, connect, simulate, type Circuit } from '../../src/logic/circuit';
import type { Bit } from '../../src/logic/boolean';

const stepDone = (id: string, c: Circuit, inputs: Record<string, Bit> = {}) =>
  TUTORIAL_STEPS.find(s => s.id === id)!.done!(c, simulate(c, inputs));

describe('tutorial del editor', () => {
  it('los pasos tienen ids únicos y los dos últimos son manuales', () => {
    expect(new Set(TUTORIAL_STEPS.map(s => s.id)).size).toBe(TUTORIAL_STEPS.length);
    expect(TUTORIAL_STEPS.filter(s => !s.done).map(s => s.id)).toEqual(['analysis', 'next']);
  });

  it('ningún paso automático está resuelto en un lienzo vacío', () => {
    for (const s of TUTORIAL_STEPS.filter(x => x.done)) expect(stepDone(s.id, emptyCircuit()), s.id).toBe(false);
  });

  it('los pasos se completan en orden al construir A·B', () => {
    let c = emptyCircuit();
    const add = (type: Parameters<typeof makeNode>[1]) => { const n = makeNode(c, type, 0, 0); c = { ...c, nodes: [...c.nodes, n] }; return n; };
    const a = add('INPUT'); expect(stepDone('input1', c)).toBe(true); expect(stepDone('input2', c)).toBe(false);
    const b = add('INPUT'); expect(stepDone('input2', c)).toBe(true);
    const g = add('AND'); expect(stepDone('gate', c)).toBe(true);
    const o = add('OUTPUT'); expect(stepDone('output', c)).toBe(true);
    c = connect(c, a.id, g.id, 0); expect(stepDone('wire1', c)).toBe(true); expect(stepDone('wire2', c)).toBe(false);
    c = connect(c, b.id, g.id, 1); expect(stepDone('wire2', c)).toBe(true);
    expect(stepDone('wire3', c)).toBe(false);
    c = connect(c, g.id, o.id, 0); expect(stepDone('wire3', c)).toBe(true);
    expect(stepDone('toggle', c, { [a.id]: 1, [b.id]: 0 })).toBe(false);
    expect(stepDone('toggle', c, { [a.id]: 1, [b.id]: 1 })).toBe(true);
  });

  it('no se cuenta como completado conectar compuertas que no son AND', () => {
    expect(stepDone('wire1', circuitFromExpressions('F = A+B'))).toBe(false);
    expect(stepDone('wire3', circuitFromExpressions('F = A+B'))).toBe(false);
  });
});
