import { describe, expect, it } from 'vitest';
import {
  EXERCISES, checkExpressionAnswer, checkTruthAnswer, compareExpressions, generateRandomExercise, literalCount, minimalLiterals, truthRows,
} from '../../src/logic/exercises';
import { checkCircuit, circuitFromExpressions } from '../../src/logic/circuit';
import { parseExpression } from '../../src/logic/circuit';
import type { Bit } from '../../src/logic/boolean';

describe('banco de ejercicios', () => {
  it('tiene ids únicos y soluciones de referencia válidas', () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.outputs.length).toBeGreaterThan(0);
      for (const o of e.outputs) expect(() => parseExpression(o.expr), e.id).not.toThrow();
      expect(e.hints.length, e.id).toBeGreaterThan(0);
    }
  });

  it('la expresión inicial de cada ejercicio de simplificar equivale a la solución', () => {
    for (const e of EXERCISES.filter(x => x.start)) {
      expect(compareExpressions(e.start!, e.outputs[0].expr).equal, e.id).toBe(true);
    }
  });

  it('cada ejercicio de circuito tiene una solución dibujable que él mismo aprueba', async () => {
    const { toUniversal } = await import('../../src/logic/circuit');
    for (const e of EXERCISES.filter(x => x.kind === 'circuit')) {
      const text = e.outputs.map(o => `${o.name} = ${o.expr}`).join('; ');
      const universal = e.allowedGates?.length === 1 ? e.allowedGates[0] : null;
      // con restricción de una sola familia, la solución de referencia es la conversión a NAND o NOR
      const c = universal ? toUniversal(circuitFromExpressions(text), universal as 'NAND' | 'NOR') : circuitFromExpressions(text, !e.maxGates); // con tope de compuertas se conserva la forma dada (p. ej. XOR en cascada)
      const r = checkCircuit(c, e.outputs, { allowed: e.allowedGates, maxGates: e.maxGates });
      expect(r.messages, `${e.id}: ${r.messages.join(' ')}`).toEqual([]);
      expect(r.ok, e.id).toBe(true);
    }
  });

  it('las restricciones de los ejercicios no se pueden cumplir con otra familia de compuertas', () => {
    for (const e of EXERCISES.filter(x => x.allowedGates)) {
      const c = circuitFromExpressions(e.outputs.map(o => `${o.name} = ${o.expr}`).join('; '));
      expect(checkCircuit(c, e.outputs, { allowed: e.allowedGates }).ok, e.id).toBe(false); // AND/OR/NOT no son NAND ni NOR
    }
  });

  it('el medio sumador en NAND cumple las restricciones del ejercicio', async () => {
    const { toUniversal } = await import('../../src/logic/circuit');
    const e = EXERCISES.find(x => x.id === 'medio-sumador-nand')!;
    const c = toUniversal(circuitFromExpressions('S = A^B; C = A*B'), 'NAND');
    expect(checkCircuit(c, e.outputs, { allowed: e.allowedGates, maxGates: e.maxGates }).ok).toBe(true);
    expect(checkCircuit(circuitFromExpressions('S = A^B; C = A*B'), e.outputs, { allowed: e.allowedGates }).ok).toBe(false);
  });
});

describe('verificación de respuestas', () => {
  const alarm = EXERCISES.find(e => e.id === 'alarma')!;
  it('acepta respuestas equivalentes escritas de otra forma', () => {
    expect(checkExpressionAnswer(alarm, "Z = B + S*T'*P + S*T'*M").status).toBe('ok');
    expect(checkExpressionAnswer(alarm, "B + (P+M)*S*!T").status).toBe('ok');
  });
  it('da un contraejemplo concreto cuando la respuesta falla', () => {
    const v = checkExpressionAnswer(alarm, 'B + S*(P+M)');
    expect(v.status).toBe('wrong');
    expect(v.counter?.env.T).toBe(1);
    expect(v.message).toMatch(/debería dar/);
  });
  it('rechaza entradas vacías o con sintaxis inválida sin lanzar', () => {
    expect(checkExpressionAnswer(alarm, '  ').status).toBe('error');
    expect(checkExpressionAnswer(alarm, 'A&B').status).toBe('error');
  });
  it('distingue "equivalente" de "simplificada"', () => {
    const s = EXERCISES.find(e => e.id === 'simp-1')!;
    expect(checkExpressionAnswer(s, "A*B + A*B' + A'*B").status).toBe('partial');
    expect(checkExpressionAnswer(s, 'B + A').status).toBe('ok');
    expect(checkExpressionAnswer(s, 'A*B').status).toBe('wrong');
  });
  it('literalCount y minimalLiterals', () => {
    expect(literalCount(parseExpression("A*B' + C"))).toBe(3);
    expect(minimalLiterals("A*B + A*B' + A'*B")).toBe(2);
  });
  it('la tabla sigue el orden de las variables del enunciado', () => {
    const e = EXERCISES.find(x => x.id === 'tabla-riego')!; // S, L, T
    const { vars, rows } = truthRows(e);
    expect(vars).toEqual(['S', 'L', 'T']);
    expect(rows[4].env).toMatchObject({ S: 1, L: 0, T: 0 }); // fila 100
    expect(rows[4].expected).toBe(1); // R = T + S·L′
  });
  it('valida la tabla de verdad', () => {
    const e = EXERCISES.find(x => x.id === 'tabla-motor')!;
    const { rows } = truthRows(e);
    expect(checkTruthAnswer(e, rows.map(r => r.expected)).status).toBe('ok');
    expect(checkTruthAnswer(e, rows.map(() => null)).status).toBe('error');
    const bad: Bit[] = rows.map(r => r.expected); bad[3] = bad[3] ? 0 : 1;
    const v = checkTruthAnswer(e, bad);
    expect(v.status).toBe('wrong');
    expect(v.message).toMatch(/fila 3/);
  });
});

describe('generador aleatorio', () => {
  it('es reproducible con la misma semilla y su solución es equivalente a la canónica', () => {
    for (const n of [3, 4, 5]) {
      const a = generateRandomExercise(123, n); const b = generateRandomExercise(123, n);
      expect(a).toEqual(b);
      expect(compareExpressions(a.start!, a.outputs[0].expr).equal).toBe(true);
    }
  });
  it('genera funciones no triviales', () => {
    for (let seed = 1; seed < 40; seed++) {
      const e = generateRandomExercise(seed, 3);
      expect(e.outputs[0].expr).not.toMatch(/^[01]$/);
    }
  });
});
