import {
  evaluateAst, formatSOP, getVariables, quineMcCluskey, type Ast, type Bit, type Environment,
} from './boolean';
import { parseExpression, type GateType, type OutputSpec } from './circuit';

export type ExerciseKind = 'expression' | 'simplify' | 'truth' | 'circuit';
export type Exercise = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  topic: string;
  kind: ExerciseKind;
  statement: string;
  /** Variables del problema con su significado físico. */
  vars: { name: string; desc: string }[];
  /** Expresión de partida (ejercicios de simplificar). */
  start?: string;
  /** Salidas de referencia (nombre y expresión). */
  outputs: OutputSpec[];
  allowedGates?: GateType[];
  maxGates?: number;
  hints: string[];
  explanation: string;
};

export const KIND_LABEL: Record<ExerciseKind, string> = {
  expression: 'Escribe la expresión',
  simplify: 'Simplifica',
  truth: 'Completa la tabla de verdad',
  circuit: 'Arma el circuito',
};

export const EXERCISES: Exercise[] = [
  {
    id: 'alarma', title: 'Alarma del laboratorio', level: 2, topic: 'Expresiones', kind: 'expression',
    statement: 'Una alarma debe sonar (Z = 1) si la puerta está abierta y el sistema armado, o si hay movimiento y el sistema está armado, o si se presiona el botón de pánico (esté o no armado). Excepción: con el interruptor de mantenimiento activo, solo suena con el botón de pánico.',
    vars: [{ name: 'P', desc: 'Puerta abierta' }, { name: 'S', desc: 'Sistema armado' }, { name: 'M', desc: 'Movimiento detectado' }, { name: 'B', desc: 'Botón de pánico' }, { name: 'T', desc: 'Mantenimiento activo' }],
    outputs: [{ name: 'Z', expr: "B + T'*S*(P+M)" }],
    hints: ['Escribe primero la condición normal: (P o M) y S.', 'El mantenimiento la anula: multiplica por T\'.', 'El pánico es independiente: se suma con OR.'],
    explanation: "Z = B + T'·S·(P + M). El botón B suena siempre; el resto solo si T = 0, S = 1 y (P o M).",
  },
  {
    id: 'alarma-circuito', title: 'Alarma: dibuja el circuito', level: 2, topic: 'Circuitos', kind: 'circuit',
    statement: "Construye el circuito de la alarma Z = B + T'·S·(P + M) arrastrando compuertas. Comprueba con los interruptores que P=1, S=1, T=0, M=0, B=0 enciende la salida.",
    vars: [{ name: 'P', desc: 'Puerta abierta' }, { name: 'S', desc: 'Sistema armado' }, { name: 'M', desc: 'Movimiento' }, { name: 'B', desc: 'Pánico' }, { name: 'T', desc: 'Mantenimiento' }],
    outputs: [{ name: 'Z', expr: "B + T'*S*(P+M)" }],
    hints: ['Necesitas un OR para P y M, y un AND con S y T\' (la T pasa por un NOT).', 'El resultado se suma con B mediante otro OR.'],
    explanation: 'Una solución con 4 compuertas: OR(P,M), NOT(T), AND de 3 entradas (S, T\', P+M) y OR final con B.',
  },
  {
    id: 'simp-1', title: 'Reduce una expresión', level: 1, topic: 'Simplificación', kind: 'simplify',
    start: "A*B + A*B' + A'*B",
    statement: 'Simplifica la expresión usando las leyes del álgebra booleana. La respuesta debe ser equivalente y tener el menor número de literales.',
    vars: [{ name: 'A', desc: 'Variable A' }, { name: 'B', desc: 'Variable B' }],
    outputs: [{ name: 'F', expr: 'A + B' }],
    hints: ["Agrupa A·B + A·B' = A·(B + B') = A.", 'Te queda A + A\'·B. ¿Qué dice la ley de absorción generalizada?'],
    explanation: "A·B + A·B' = A. Luego A + A'·B = A + B (A + A'B = A + B).",
  },
  {
    id: 'simp-2', title: 'Consenso', level: 2, topic: 'Simplificación', kind: 'simplify',
    start: "A*B + A'*C + B*C",
    statement: 'Simplifica F. Hay un término que sobra: ¿cuál y por qué?',
    vars: [{ name: 'A', desc: '' }, { name: 'B', desc: '' }, { name: 'C', desc: '' }],
    outputs: [{ name: 'F', expr: "A*B + A'*C" }],
    hints: ['Fíjate en B·C: es el término de consenso de A·B y A\'·C.'],
    explanation: "Teorema del consenso: A·B + A'·C + B·C = A·B + A'·C. Observa el mapa de Karnaugh: B·C queda cubierto por los otros dos grupos.",
  },
  {
    id: 'tabla-motor', title: 'Control de motor', level: 1, topic: 'Tabla de verdad', kind: 'truth',
    statement: 'Un motor (M) arranca solo si el interruptor general (G) está activo y NO está presionado el paro de emergencia (E), o bien si está en modo manual (A). Completa la columna de salida.',
    vars: [{ name: 'A', desc: 'Modo manual' }, { name: 'E', desc: 'Paro de emergencia' }, { name: 'G', desc: 'Interruptor general' }],
    outputs: [{ name: 'M', expr: "A + G*E'" }],
    hints: ['Calcula M = A + G·E\' fila por fila.'],
    explanation: "M = A + G·E'. Vale 1 siempre que A = 1, y también cuando G = 1 y E = 0.",
  },
  {
    id: 'mayoria', title: 'Votación por mayoría', level: 2, topic: 'Circuitos', kind: 'circuit',
    statement: 'Tres jueces votan (1 = aprueba). El resultado M es 1 cuando al menos dos aprueban. Dibuja el circuito.',
    vars: [{ name: 'A', desc: 'Juez 1' }, { name: 'B', desc: 'Juez 2' }, { name: 'C', desc: 'Juez 3' }],
    outputs: [{ name: 'M', expr: 'A*B + A*C + B*C' }],
    hints: ['Hay mayoría si coinciden A y B, o A y C, o B y C.', 'Tres AND de dos entradas y un OR de tres entradas.'],
    explanation: 'M = AB + AC + BC: 3 AND y 1 OR de tres entradas (4 compuertas).',
  },
  {
    id: 'medio-sumador', title: 'Medio sumador', level: 1, topic: 'Circuitos', kind: 'circuit',
    statement: 'Suma dos bits A y B. La salida S es el bit de suma y C el acarreo. Construye un circuito con ambas salidas.',
    vars: [{ name: 'A', desc: 'Primer bit' }, { name: 'B', desc: 'Segundo bit' }],
    outputs: [{ name: 'S', expr: 'A^B' }, { name: 'C', expr: 'A*B' }],
    hints: ['La suma sin acarreo es 1 cuando los bits son distintos.', 'El acarreo es 1 solo si ambos bits valen 1.'],
    explanation: 'S = A ⊕ B (XOR) y C = A·B (AND). Dos compuertas.',
  },
  {
    id: 'medio-sumador-nand', title: 'Medio sumador solo con NAND', level: 3, topic: 'NAND / NOR', kind: 'circuit',
    statement: 'El laboratorio solo tiene un chip 7400 (4 compuertas NAND). Construye el medio sumador (S y C) usando únicamente NAND y máximo 5 compuertas.',
    vars: [{ name: 'A', desc: 'Primer bit' }, { name: 'B', desc: 'Segundo bit' }],
    outputs: [{ name: 'S', expr: 'A^B' }, { name: 'C', expr: 'A*B' }],
    allowedGates: ['NAND'], maxGates: 5,
    hints: ['Calcula N = NAND(A,B). Ese resultado sirve para S y para el acarreo.', 'S = NAND( NAND(A,N), NAND(B,N) ).', 'C = NOT(N) = NAND(N,N): une las dos entradas de una NAND.'],
    explanation: 'Con 5 NAND: N=NAND(A,B); S=NAND(NAND(A,N),NAND(B,N)); C=NAND(N,N). Necesitas 2 chips 7400, pues uno solo trae 4 compuertas.',
  },
  {
    id: 'mux', title: 'Multiplexor 2 a 1', level: 2, topic: 'Circuitos', kind: 'circuit',
    statement: 'Si el selector S vale 0 la salida Y copia a A; si vale 1 copia a B. Dibuja el circuito.',
    vars: [{ name: 'S', desc: 'Selector' }, { name: 'A', desc: 'Dato 0' }, { name: 'B', desc: 'Dato 1' }],
    outputs: [{ name: 'Y', expr: "S'*A + S*B" }],
    hints: ["Y = S'·A + S·B.", 'Necesitas un NOT para S, dos AND y un OR.'],
    explanation: "Y = S'A + SB: 1 NOT, 2 AND, 1 OR.",
  },
  {
    id: 'paridad', title: 'Detector de paridad', level: 2, topic: 'Circuitos', kind: 'circuit',
    statement: 'La salida P vale 1 cuando entre A, B y C hay una cantidad IMPAR de unos. Dibuja el circuito con el menor número de compuertas.',
    vars: [{ name: 'A', desc: '' }, { name: 'B', desc: '' }, { name: 'C', desc: '' }],
    outputs: [{ name: 'P', expr: 'A^B^C' }],
    maxGates: 2,
    hints: ['XOR es 1 cuando sus entradas son distintas.', 'Encadena dos XOR.'],
    explanation: 'P = A ⊕ B ⊕ C con 2 compuertas XOR en cascada.',
  },
  {
    id: 'comparador', title: 'Comparador de 1 bit', level: 1, topic: 'Expresiones', kind: 'expression',
    statement: 'La salida G vale 1 cuando el número A es estrictamente mayor que B (ambos de un bit). Escribe la expresión.',
    vars: [{ name: 'A', desc: 'Primer número' }, { name: 'B', desc: 'Segundo número' }],
    outputs: [{ name: 'G', expr: "A*B'" }],
    hints: ['Solo hay un caso en que A > B con un bit: A = 1 y B = 0.'],
    explanation: "G = A·B'. Es la única fila con salida 1.",
  },
  {
    id: 'primos', title: 'Detector de números primos', level: 3, topic: 'Simplificación', kind: 'simplify',
    start: "A'*B'*C*D + A'*B*C'*D + A'*B*C*D + A*B'*C*D + A*B*C'*D + A'*B'*C*D'",
    statement: 'La entrada ABCD es un número de 4 bits. La salida F vale 1 para los primos 2, 3, 5, 7, 11 y 13. Simplifica la expresión canónica que se da (usa el mapa de Karnaugh en la calculadora o en el editor).',
    vars: [{ name: 'A', desc: 'Bit 3 (MSB)' }, { name: 'B', desc: 'Bit 2' }, { name: 'C', desc: 'Bit 1' }, { name: 'D', desc: 'Bit 0 (LSB)' }],
    outputs: [{ name: 'F', expr: "A'*B'*C + A'*B*D + B'*C*D + B*C'*D" }],
    hints: ['Dibuja el mapa de 4 variables y marca m2, m3, m5, m7, m11, m13.', 'Busca grupos de 2 celdas; ninguno de 4 es posible.'],
    explanation: "Σ m(2,3,5,7,11,13) = A'B'C + A'BD + B'CD + BC'D, cuatro grupos de dos celdas.",
  },
];

// ───────────────────────── Verificación ─────────────────────────

export type Verdict = { status: 'ok' | 'partial' | 'wrong' | 'error'; message: string; counter?: { env: Environment; got: Bit; expected: Bit } };

const realVars = (ast: Ast) => [...getVariables(ast)].filter(v => v !== '0' && v !== '1').sort();

export const literalCount = (ast: Ast): number => (ast.type === 'VAR' ? (ast.name === '0' || ast.name === '1' ? 0 : 1) : ast.type === 'NOT' ? literalCount(ast.child) : literalCount(ast.left) + literalCount(ast.right));

/** Compara dos expresiones fila por fila y devuelve un contraejemplo si difieren. */
export const compareExpressions = (userText: string, refText: string) => {
  const user = parseExpression(userText);
  const ref = parseExpression(refText);
  const vars = [...new Set([...realVars(user), ...realVars(ref)])].sort();
  if (vars.length > 12) throw new Error('Demasiadas variables para comparar.');
  for (let r = 0; r < 2 ** vars.length; r++) {
    const env: Environment = Object.create(null);
    vars.forEach((v, j) => { env[v] = (r >> (vars.length - 1 - j)) & 1; });
    const got = evaluateAst(user, env);
    const expected = evaluateAst(ref, env);
    if (got !== expected) return { equal: false as const, user, ref, counter: { env, got, expected }, vars };
  }
  return { equal: true as const, user, ref, vars };
};

const describeEnv = (env: Environment) => Object.entries(env).map(([k, v]) => `${k}=${v}`).join(', ');

export const minimalLiterals = (refText: string): number => {
  const ref = parseExpression(refText);
  const vars = realVars(ref);
  const minterms: number[] = [];
  for (let r = 0; r < 2 ** vars.length; r++) {
    const env: Environment = Object.create(null);
    vars.forEach((v, j) => { env[v] = (r >> (vars.length - 1 - j)) & 1; });
    if (evaluateAst(ref, env) === 1) minterms.push(r);
  }
  return literalCount(parseExpression(formatSOP(quineMcCluskey(minterms, vars.length), vars)));
};

export const checkExpressionAnswer = (ex: Exercise, answer: string): Verdict => {
  const text = answer.trim();
  if (!text) return { status: 'error', message: 'Escribe una expresión.' };
  const stripped = text.replace(/^\s*[a-zA-Z_]\w*\s*=/, '');
  try {
    const cmp = compareExpressions(stripped, ex.outputs[0].expr);
    if (!cmp.equal) {
      const c = cmp.counter;
      return { status: 'wrong', counter: c, message: `No coincide. Con ${describeEnv(c.env)} tu expresión da ${c.got} pero debería dar ${c.expected}.` };
    }
    if (ex.kind === 'simplify') {
      const have = literalCount(cmp.user);
      const best = minimalLiterals(ex.outputs[0].expr);
      if (have > best) return { status: 'partial', message: `Es equivalente, pero aún se puede simplificar: tiene ${have} literales y se logra con ${best}.` };
    }
    return { status: 'ok', message: '¡Correcto! Tu expresión es equivalente a la solución.' };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Expresión inválida.' };
  }
};

export const truthRows = (ex: Exercise) => {
  const ref = parseExpression(ex.outputs[0].expr);
  const vars = ex.vars.map(v => v.name).sort();
  const rows = Array.from({ length: 2 ** vars.length }, (_, r) => {
    const env: Environment = Object.create(null);
    vars.forEach((v, j) => { env[v] = (r >> (vars.length - 1 - j)) & 1; });
    return { env, expected: evaluateAst(ref, env) };
  });
  return { vars, rows };
};

export const checkTruthAnswer = (ex: Exercise, answers: (Bit | null)[]): Verdict => {
  const { vars, rows } = truthRows(ex);
  const empty = answers.filter(a => a === null).length;
  if (empty) return { status: 'error', message: `Faltan ${empty} fila${empty === 1 ? '' : 's'} por completar.` };
  const bad = rows.findIndex((r, i) => answers[i] !== r.expected);
  if (bad >= 0) {
    const wrong = rows.filter((r, i) => answers[i] !== r.expected).length;
    return { status: 'wrong', message: `${wrong} fila${wrong === 1 ? '' : 's'} incorrecta${wrong === 1 ? '' : 's'}. Revisa la fila ${bad} (${vars.map(v => `${v}=${rows[bad].env[v]}`).join(', ')}).` };
  }
  return { status: 'ok', message: '¡Tabla correcta!' };
};

// ───────────────────────── Generador aleatorio ─────────────────────────

/** Genera un ejercicio de simplificación a partir de minterms aleatorios (semilla reproducible). */
export const generateRandomExercise = (seed = Date.now(), numVars = 3): Exercise => {
  let state = seed >>> 0 || 1;
  const rnd = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const names = 'ABCDE'.slice(0, numVars).split('');
  const total = 2 ** numVars;
  let minterms: number[] = [];
  do { minterms = Array.from({ length: total }, (_, i) => i).filter(() => rnd() < 0.5); } while (minterms.length < 2 || minterms.length > total - 2);
  const canon = minterms.map(m => names.map((v, j) => v + (((m >> (numVars - 1 - j)) & 1) ? '' : "'")).join('*')).join(' + ');
  const sop = formatSOP(quineMcCluskey(minterms, numVars), names);
  return {
    id: `rand-${seed}`, title: `Aleatorio de ${numVars} variables`, level: numVars <= 3 ? 1 : numVars === 4 ? 2 : 3, topic: 'Aleatorio', kind: 'simplify',
    start: canon,
    statement: `Simplifica la función F = Σ m(${minterms.join(', ')}). Se da su forma canónica; busca grupos en el mapa de Karnaugh.`,
    vars: names.map(n => ({ name: n, desc: '' })),
    outputs: [{ name: 'F', expr: sop }],
    hints: ['Marca los minterms en un mapa de Karnaugh y forma los grupos más grandes posibles (potencias de 2).'],
    explanation: `Una solución mínima es F = ${sop}.`,
  };
};
