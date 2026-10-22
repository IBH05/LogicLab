import { describe, expect, it } from 'vitest';
import { calculateExpression, evaluateAst, Parser, tokenize, quineMcCluskey, formatSOP, formatPOS, buildNandFromSOP, buildNorFromPOS, generateAsciiTree, generateDotGraph, annotateAstWithValues } from '../../src/logic/boolean';
import type { Environment } from '../../src/logic/boolean';

function evaluateUniversal(expression: string, environment: Environment): number {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_]*|[()]/g) ?? [];
  let cursor = 0;
  function read(): number {
    const token = tokens[cursor++];
    if (token !== '(') return environment[token];
    const values = [read()];
    const operator = tokens[cursor];
    while (tokens[cursor] !== ')') {
      expect(tokens[cursor++]).toBe(operator);
      values.push(read());
    }
    cursor++;
    expect(['NAND', 'NOR']).toContain(operator);
    return operator === 'NAND' ? Number(!values.every(Boolean)) : Number(!values.some(Boolean));
  }
  const result = read();
  expect(cursor).toBe(tokens.length);
  return result;
}

describe('RF-01 entrada y errores', () => {
  it.each(['A AND B', 'A · B', 'F = A*B'])('acepta %s', expression => {
    expect(calculateExpression(expression).table.map(row => row.result)).toEqual([0, 0, 0, 1]);
  });
  it.each(['', 'A+', '(A+B', 'A B', 'A&', 'A/ B', 'A$+B', 'F==A', '1= A', 'A+2'])('rechaza %s', expression => {
    expect(() => calculateExpression(expression)).toThrow();
  });
  it('acepta NOT y conserva identificadores de varias letras', () => {
    expect(calculateExpression('NOT Pwr').variables).toEqual(['Pwr']);
    expect(calculateExpression('NOT Pwr').table.map(row => row.result)).toEqual([1, 0]);
    expect(calculateExpression('A + BC').variables).toEqual(['A', 'BC']);
  });
  it('acepta constantes y nombres que coinciden con propiedades de objetos', () => {
    expect(calculateExpression('A+0').sop).toBe('A');
    expect(calculateExpression('1').table.map(row => row.result)).toEqual([1]);
    expect(calculateExpression('__proto__').table.map(row => row.result)).toEqual([0, 1]);
  });
});

describe('RF-04 y RF-06 resultados conocidos', () => {
  it.each([
    ['A+A*B', 'A'], ['A*A\'', '0'], ['A+A\'', '1'], ['A*B+A*B\'', 'A'],
  ])('simplifica %s a %s', (expression, expected) => {
    const result = calculateExpression(expression);
    expect(result.sop).toBe(expected);
    expect(result.isValidated).toBe(true);
  });
  it('respeta precedencia y XOR', () => {
    expect(calculateExpression('A ^ B').table.map(row => row.result)).toEqual([0, 1, 1, 0]);
    const tree = new Parser(tokenize('A+B*C')).parse();
    expect(evaluateAst(tree, { A: 1, B: 0, C: 0 })).toBe(1);
  });
  it('mantiene la restricción original por encima de doce variables', () => {
    const result = calculateExpression(Array.from({ length: 13 }, (_, index) => `V${index}`).join('+'));
    expect(result.isTooBig).toBe(true);
    expect(result.table).toEqual([]);
  });
});

describe('RF-02 y RF-03 procedimiento verificable', () => {
  it('registra una secuencia ordenada con ley y explicación para una reducción', () => {
    const result = calculateExpression('A+A*B');

    expect(result.steps.length).toBeGreaterThan(1);
    expect(result.steps.at(-1)?.after).toBe('A');
    expect(result.steps.every(step => step.equivalent)).toBe(true);
    expect(result.steps.every(step => step.law.length > 0 && step.explanation.length > 0)).toBe(true);
    expect(result.steps.map(step => step.index)).toEqual(result.steps.map((_, index) => index + 1));
    expect(result.steps.some(step => step.law.includes('Reducción') || step.law.includes('Absorción'))).toBe(true);
    expect(result.stepsValidated).toBe(true);
  });

  it('explica cuando una expresión ya está simplificada', () => {
    const result = calculateExpression('A');
    const step = result.steps[0];

    expect(result.sop).toBe('A');
    expect(result.steps).toHaveLength(1);
    expect(step.changed).toBe(false);
    expect(step.law).toBe('Identidad');
    expect(step.explanation).toMatch(/ya está simplificada/);
    expect(step.equivalent).toBe(true);
  });

  it.each(['A*B', 'A+B', 'A^B', '0', '1', "(A+B)*(A'+C)+B*C"])('mantiene la equivalencia en cada paso de %s', expression => {
    const result = calculateExpression(expression);

    expect(result.stepsValidated).toBe(true);
    expect(result.steps.at(-1)?.after).toBe(result.sop);
    expect(result.steps.every(step => step.equivalent)).toBe(true);
  });

  it('no genera una traza para entradas inválidas porque detiene el cálculo', () => {
    expect(() => calculateExpression('A&')).toThrow();
    expect(() => calculateExpression('(A+B')).toThrow();
  });
});

describe('RNF-03 equivalencia independiente', () => {
  it('NOR representa A y A negada correctamente', () => {
    for (const expression of ['A', "A'"]) {
      const result = calculateExpression(expression);
      for (const row of result.table) expect(evaluateUniversal(result.norOnly, row.env)).toBe(row.result);
    }
  });
  it('SOP, POS, NAND y NOR conservan las 256 funciones de tres variables', () => {
    const variables = ['A', 'B', 'C'];
    for (let functionIndex = 0; functionIndex < 256; functionIndex++) {
      const minterms = Array.from({ length: 8 }, (_, row) => row).filter(row => (functionIndex >> row) & 1);
      const maxterms = Array.from({ length: 8 }, (_, row) => row).filter(row => !minterms.includes(row));
      const positive = quineMcCluskey(minterms, 3);
      const complement = quineMcCluskey(maxterms, 3);
      const sop = new Parser(tokenize(formatSOP(positive, variables))).parse();
      const pos = new Parser(tokenize(formatPOS(complement, variables))).parse();
      for (let row = 0; row < 8; row++) {
        const environment = { A: (row >> 2) & 1, B: (row >> 1) & 1, C: row & 1 };
        const expected = (functionIndex >> row) & 1;
        expect(evaluateAst(sop, environment)).toBe(expected);
        expect(evaluateAst(pos, environment)).toBe(expected);
        expect(evaluateUniversal(buildNandFromSOP(positive, variables), environment)).toBe(expected);
        expect(evaluateUniversal(buildNorFromPOS(complement, variables), environment)).toBe(expected);
      }
    }
  });
  it('produce resultados deterministas', () => {
    expect(calculateExpression("(A+B)*(A'+C)+B*C")).toEqual(calculateExpression("(A+B)*(A'+C)+B*C"));
  });
});

describe('RF-05 diagramas', () => {
  it('identifica operadores y propaga valores sin mutar el árbol', () => {
    const tree = new Parser(tokenize('!(A*B)^C')).parse();
    const annotated = annotateAstWithValues(tree, { A: 1, B: 1, C: 0 });
    expect(annotated.value).toBe(0);
    expect(tree.value).toBeUndefined();
    expect(generateAsciiTree(annotated)).toContain('XOR [=0]');
    expect(generateDotGraph(tree)).toContain('AND');
    expect(generateDotGraph(tree)).toContain('NOT');
  });
});
