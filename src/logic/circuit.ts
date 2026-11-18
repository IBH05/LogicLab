import {
  type Ast, type Bit, type Environment,
  formatAst, formatSOP, formatPOS, getVariables, quineMcCluskey, buildNandFromSOP, buildNorFromPOS,
  Parser, tokenize, evaluateAst,
} from './boolean';

/**
 * Modelo de circuito lógico editable: un grafo dirigido acíclico de compuertas.
 * No depende de React; lo usan el editor, los ejercicios y las pruebas.
 */
export type GateType = 'INPUT' | 'OUTPUT' | 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR';
export type CNode = { id: string; type: GateType; x: number; y: number; label: string; pins: number };
export type CWire = { id: string; from: string; to: string; pin: number };
export type Circuit = { nodes: CNode[]; wires: CWire[] };

export const GATE_TYPES: GateType[] = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];
export const MAX_PINS = 4;
export const MAX_TABLE_VARS = 12;
/** Quine-McCluskey crece muy rápido: con más entradas se omite la simplificación exacta. */
export const SIMPLIFY_LIMIT = 10;

let counter = 0;
export const newId = (prefix = 'n') => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export const emptyCircuit = (): Circuit => ({ nodes: [], wires: [] });

export const pinCount = (node: Pick<CNode, 'type' | 'pins'>): number => {
  switch (node.type) {
    case 'INPUT': return 0;
    case 'OUTPUT': case 'NOT': return 1;
    case 'XOR': case 'XNOR': return 2;
    default: return Math.min(MAX_PINS, Math.max(2, node.pins || 2));
  }
};

export const isGate = (type: GateType) => type !== 'INPUT' && type !== 'OUTPUT';
export const isValidLabel = (label: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(label) && !['AND', 'OR', 'XOR', 'NOT'].includes(label.toUpperCase());

const nextLabel = (used: Set<string>, pool: string) => {
  for (const ch of pool) if (!used.has(ch)) return ch;
  let i = 1;
  while (used.has(`${pool[0]}${i}`)) i++;
  return `${pool[0]}${i}`;
};

/** Crea un nodo con etiqueta automática única (A, B, C… para entradas; F, G… para salidas). */
export const makeNode = (circuit: Circuit, type: GateType, x: number, y: number): CNode => {
  const used = new Set(circuit.nodes.filter(n => n.type === type).map(n => n.label));
  const label = type === 'INPUT' ? nextLabel(used, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    : type === 'OUTPUT' ? nextLabel(used, 'FGHZYWXV') : '';
  return { id: newId(), type, x, y, label, pins: 2 };
};

export const driverMap = (c: Circuit) => {
  const map = new Map<string, string>();
  for (const w of c.wires) map.set(`${w.to}:${w.pin}`, w.from);
  return map;
};

export const gateEval = (type: GateType, bits: Bit[]): Bit => {
  switch (type) {
    case 'NOT': return bits[0] ? 0 : 1;
    case 'AND': return bits.every(b => b) ? 1 : 0;
    case 'NAND': return bits.every(b => b) ? 0 : 1;
    case 'OR': return bits.some(b => b) ? 1 : 0;
    case 'NOR': return bits.some(b => b) ? 0 : 1;
    case 'XOR': return (bits.reduce<number>((a, b) => a ^ b, 0) as Bit);
    case 'XNOR': return (bits.reduce<number>((a, b) => a ^ b, 1) as Bit);
    default: return bits[0] ?? 0;
  }
};

/** Valor de cada nodo (null si hay una entrada sin conectar o un ciclo). */
export const simulate = (c: Circuit, inputs: Record<string, Bit>): Map<string, Bit | null> => {
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  const drivers = driverMap(c);
  const memo = new Map<string, Bit | null>();
  const visiting = new Set<string>();
  const val = (id: string): Bit | null => {
    if (memo.has(id)) return memo.get(id)!;
    const node = byId.get(id);
    if (!node || visiting.has(id)) return null;
    let result: Bit | null;
    if (node.type === 'INPUT') result = inputs[id] ?? 0;
    else {
      visiting.add(id);
      const bits: Bit[] = [];
      let missing = false;
      for (let p = 0; p < pinCount(node); p++) {
        const d = drivers.get(`${id}:${p}`);
        const v = d ? val(d) : null;
        if (v === null) missing = true; else bits.push(v);
      }
      visiting.delete(id);
      result = missing ? null : gateEval(node.type, bits);
    }
    memo.set(id, result);
    return result;
  };
  for (const n of c.nodes) val(n.id);
  return memo;
};

/** ¿Conectar `from` → `to` crearía un ciclo? (realimentación no soportada) */
export const wouldCycle = (c: Circuit, from: string, to: string): boolean => {
  if (from === to) return true;
  const out = new Map<string, string[]>();
  for (const w of c.wires) out.set(w.from, [...(out.get(w.from) ?? []), w.to]);
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(out.get(cur) ?? []));
  }
  return false;
};

export const canConnect = (c: Circuit, from: string, to: string, pin: number): boolean => {
  const a = c.nodes.find(n => n.id === from);
  const b = c.nodes.find(n => n.id === to);
  if (!a || !b || a.type === 'OUTPUT' || pin < 0 || pin >= pinCount(b)) return false;
  const withoutOld = { ...c, wires: c.wires.filter(w => !(w.to === to && w.pin === pin)) };
  return !wouldCycle(withoutOld, from, to);
};

export const connect = (c: Circuit, from: string, to: string, pin: number): Circuit => {
  if (!canConnect(c, from, to, pin)) return c;
  return { ...c, wires: [...c.wires.filter(w => !(w.to === to && w.pin === pin)), { id: newId('w'), from, to, pin }] };
};

export const removeNode = (c: Circuit, id: string): Circuit => ({
  nodes: c.nodes.filter(n => n.id !== id),
  wires: c.wires.filter(w => w.from !== id && w.to !== id),
});

/** Quita los cables que apuntan a pines que ya no existen (al reducir el número de entradas). */
export const pruneWires = (c: Circuit): Circuit => {
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  return { ...c, wires: c.wires.filter(w => byId.has(w.from) && byId.has(w.to) && w.pin < pinCount(byId.get(w.to)!)) };
};

export const sortedInputs = (c: Circuit) => c.nodes.filter(n => n.type === 'INPUT').sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

export const coneInputs = (c: Circuit, nodeId: string): CNode[] => {
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  const drivers = driverMap(c);
  const seen = new Set<string>();
  const found: CNode[] = [];
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = byId.get(id);
    if (!n) return;
    if (n.type === 'INPUT') { found.push(n); return; }
    for (let p = 0; p < pinCount(n); p++) { const d = drivers.get(`${id}:${p}`); if (d) walk(d); }
  };
  walk(nodeId);
  return found.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
};

export type CircuitIssue = { level: 'error' | 'warning'; text: string };

export const circuitIssues = (c: Circuit): CircuitIssue[] => {
  const issues: CircuitIssue[] = [];
  const inputs = c.nodes.filter(n => n.type === 'INPUT');
  const outputs = c.nodes.filter(n => n.type === 'OUTPUT');
  if (!inputs.length) issues.push({ level: 'error', text: 'Falta al menos una entrada.' });
  if (!outputs.length) issues.push({ level: 'error', text: 'Falta al menos una salida.' });
  for (const type of ['INPUT', 'OUTPUT'] as const) {
    const labels = c.nodes.filter(n => n.type === type).map(n => n.label);
    for (const label of labels) if (!isValidLabel(label)) issues.push({ level: 'error', text: `Nombre no válido: "${label}". Usa letras, números o _, empezando con letra.` });
    const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
    for (const d of new Set(dup)) issues.push({ level: 'error', text: `Nombre repetido: "${d}".` });
  }
  const drivers = driverMap(c);
  for (const n of c.nodes) {
    for (let p = 0; p < pinCount(n); p++) {
      if (!drivers.has(`${n.id}:${p}`)) {
        const name = n.type === 'OUTPUT' ? `la salida ${n.label}` : `una compuerta ${n.type}`;
        issues.push({ level: 'error', text: `Hay una entrada sin conectar en ${name}.` });
        break;
      }
    }
  }
  const used = new Set(c.wires.map(w => w.from));
  for (const n of c.nodes) if (n.type !== 'OUTPUT' && !used.has(n.id)) issues.push({ level: 'warning', text: n.type === 'INPUT' ? `La entrada ${n.label} no se usa.` : `Una compuerta ${n.type} tiene la salida sin conectar.` });
  return issues;
};

/** Expresión (AST) que calcula un nodo; null si falta algún cable. */
export const toAst = (c: Circuit, nodeId: string): Ast | null => {
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  const drivers = driverMap(c);
  const memo = new Map<string, Ast | null>();
  const visiting = new Set<string>();
  const build = (id: string): Ast | null => {
    if (memo.has(id)) return memo.get(id)!;
    const n = byId.get(id);
    if (!n || visiting.has(id)) return null;
    if (n.type === 'INPUT') { const a: Ast = { type: 'VAR', name: n.label }; memo.set(id, a); return a; }
    visiting.add(id);
    const kids: Ast[] = [];
    let ok = true;
    for (let p = 0; p < pinCount(n); p++) {
      const d = drivers.get(`${id}:${p}`);
      const k = d ? build(d) : null;
      if (!k) ok = false; else kids.push(k);
    }
    visiting.delete(id);
    let result: Ast | null = null;
    if (ok) {
      const fold = (type: 'AND' | 'OR' | 'XOR') => kids.slice(1).reduce<Ast>((l, r) => ({ type, left: l, right: r }), kids[0]);
      switch (n.type) {
        case 'OUTPUT': result = kids[0]; break;
        case 'NOT': result = { type: 'NOT', child: kids[0] }; break;
        case 'AND': case 'OR': case 'XOR': result = fold(n.type); break;
        case 'NAND': result = { type: 'NOT', child: fold('AND') }; break;
        case 'NOR': result = { type: 'NOT', child: fold('OR') }; break;
        case 'XNOR': result = { type: 'NOT', child: fold('XOR') }; break;
      }
    }
    memo.set(id, result);
    return result;
  };
  return build(nodeId);
};

export const parseExpression = (text: string): Ast => new Parser(tokenize(text)).parse();

export type OutputAnalysis = {
  node: CNode;
  vars: string[];
  expression: string | null;
  minterms: number[];
  maxterms: number[];
  rows: { env: Environment; result: Bit }[];
  sop: string;
  pos: string;
  nand: string;
  nor: string;
  tooBig: boolean;
  complete: boolean;
  /** false si no se calculó la simplificación (se pidió omitirla o hay demasiadas entradas). */
  simplified: boolean;
};

/** Tabla de verdad de una salida, calculada por simulación directa del circuito. */
export const analyzeOutput = (c: Circuit, outputId: string, opts: { simplify?: boolean } = {}): OutputAnalysis | null => {
  const node = c.nodes.find(n => n.id === outputId && n.type === 'OUTPUT');
  if (!node) return null;
  const inputs = coneInputs(c, outputId);
  const vars = inputs.map(n => n.label);
  const ast = toAst(c, outputId);
  let expression: string | null = null;
  if (ast) { const text = formatAst(ast); expression = text.length <= 1500 ? text : null; }
  const base: OutputAnalysis = { node, vars, expression, minterms: [], maxterms: [], rows: [], sop: '', pos: '', nand: '', nor: '', tooBig: vars.length > MAX_TABLE_VARS, complete: Boolean(ast), simplified: false };
  if (!ast || base.tooBig) return base;
  const rows: OutputAnalysis['rows'] = [];
  const minterms: number[] = [];
  const maxterms: number[] = [];
  for (let i = 0; i < 2 ** vars.length; i++) {
    const bits: Record<string, Bit> = {};
    const env: Environment = Object.create(null);
    inputs.forEach((inp, j) => { const b = ((i >> (vars.length - 1 - j)) & 1) as Bit; bits[inp.id] = b; env[inp.label] = b; });
    const result = simulate(c, bits).get(outputId) ?? 0;
    rows.push({ env, result });
    (result === 1 ? minterms : maxterms).push(i);
  }
  if (opts.simplify === false || vars.length > SIMPLIFY_LIMIT) return { ...base, rows, minterms, maxterms };
  const qmSop = quineMcCluskey(minterms, vars.length);
  const qmComp = quineMcCluskey(maxterms, vars.length);
  return {
    ...base, rows, minterms, maxterms, simplified: true,
    sop: formatSOP(qmSop, vars), pos: formatPOS(qmComp, vars),
    nand: buildNandFromSOP(qmSop, vars), nor: buildNorFromPOS(qmComp, vars),
  };
};

// ───────────────────────── Caminos ─────────────────────────

export type PathInfo = { nodes: string[]; gates: number };
export type PathsResult = { paths: PathInfo[]; total: number; truncated: boolean; depth: number };

/** Caminos entrada → salida (secuencias de nodos distintas) y retardo en niveles de compuertas. */
export const circuitPaths = (c: Circuit, outputId: string, limit = 300): PathsResult => {
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  const drivers = driverMap(c);
  const uniq = (id: string) => {
    const n = byId.get(id);
    const list: string[] = [];
    if (n) for (let p = 0; p < pinCount(n); p++) { const d = drivers.get(`${id}:${p}`); if (d && !list.includes(d)) list.push(d); }
    return list;
  };
  const countMemo = new Map<string, number>();
  const count = (id: string, guard = new Set<string>()): number => {
    if (countMemo.has(id)) return countMemo.get(id)!;
    if (guard.has(id)) return 0;
    const n = byId.get(id);
    if (!n) return 0;
    let total = 0;
    if (n.type === 'INPUT') total = 1;
    else { guard.add(id); for (const d of uniq(id)) total += count(d, guard); guard.delete(id); }
    countMemo.set(id, total);
    return total;
  };
  const total = count(outputId);
  const paths: PathInfo[] = [];
  const walk = (id: string, tail: string[]) => {
    if (paths.length >= limit) return;
    const n = byId.get(id);
    if (!n) return;
    const path = [id, ...tail];
    if (n.type === 'INPUT') { paths.push({ nodes: path, gates: path.filter(p => isGate(byId.get(p)!.type)).length }); return; }
    for (const d of uniq(id)) walk(d, path);
  };
  walk(outputId, []);
  const depthMemo = new Map<string, number>();
  const depthOf = (id: string, guard = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    const n = byId.get(id);
    if (!n || guard.has(id)) return 0;
    guard.add(id);
    const best = Math.max(0, ...uniq(id).map(d => depthOf(d, guard)));
    guard.delete(id);
    const result = best + (isGate(n.type) ? 1 : 0);
    depthMemo.set(id, result);
    return result;
  };
  paths.sort((a, b) => b.gates - a.gates);
  return { paths, total, truncated: total > paths.length, depth: depthOf(outputId) };
};

// ───────────────────────── Costo y circuitos integrados ─────────────────────────

const CHIPS: Record<string, { chip: string; per: number }> = {
  'NOT/1': { chip: '7404', per: 6 },
  'AND/2': { chip: '7408', per: 4 }, 'AND/3': { chip: '7411', per: 3 }, 'AND/4': { chip: '7421', per: 2 },
  'OR/2': { chip: '7432', per: 4 }, 'OR/3': { chip: '74HC4075', per: 3 }, 'OR/4': { chip: '74HC4072', per: 2 },
  'NAND/2': { chip: '7400', per: 4 }, 'NAND/3': { chip: '7410', per: 3 }, 'NAND/4': { chip: '7420', per: 2 },
  'NOR/2': { chip: '7402', per: 4 }, 'NOR/3': { chip: '7427', per: 3 }, 'NOR/4': { chip: '74HC4002', per: 2 },
  'XOR/2': { chip: '7486', per: 4 }, 'XNOR/2': { chip: '74266', per: 4 },
};

export type CostRow = { gate: GateType; pins: number; count: number; chip: string; perChip: number; chips: number };
export type CircuitCost = { rows: CostRow[]; gates: number; gateInputs: number; chips: number };

export const circuitCost = (c: Circuit): CircuitCost => {
  const tally = new Map<string, CostRow>();
  let gates = 0;
  let gateInputs = 0;
  for (const n of c.nodes) {
    if (!isGate(n.type)) continue;
    const pins = pinCount(n);
    const key = `${n.type}/${pins}`;
    const info = CHIPS[key] ?? { chip: '—', per: 1 };
    const row = tally.get(key) ?? { gate: n.type, pins, count: 0, chip: info.chip, perChip: info.per, chips: 0 };
    row.count++;
    tally.set(key, row);
    gates++;
    gateInputs += pins;
  }
  const rows = [...tally.values()].map(r => ({ ...r, chips: Math.ceil(r.count / r.perChip) }));
  return { rows, gates, gateInputs, chips: rows.reduce((s, r) => s + r.chips, 0) };
};

// ───────────────────────── Acomodo automático ─────────────────────────

const NODE_H = (n: CNode) => (n.type === 'INPUT' || n.type === 'OUTPUT' || n.type === 'NOT' ? 40 : Math.max(40, pinCount(n) * 20));

export const autoLayout = (c: Circuit): Circuit => {
  const drivers = driverMap(c);
  const byId = new Map(c.nodes.map(n => [n.id, n]));
  const level = new Map<string, number>();
  const lv = (id: string, guard = new Set<string>()): number => {
    if (level.has(id)) return level.get(id)!;
    const n = byId.get(id)!;
    if (n.type === 'INPUT') { level.set(id, 0); return 0; }
    if (guard.has(id)) return 0;
    guard.add(id);
    let best = 0;
    for (let p = 0; p < pinCount(n); p++) { const d = drivers.get(`${id}:${p}`); if (d) best = Math.max(best, lv(d, guard) + 1); }
    guard.delete(id);
    const result = Math.max(best, 1);
    level.set(id, result);
    return result;
  };
  c.nodes.forEach(n => lv(n.id));
  const maxLevel = Math.max(0, ...level.values());
  for (const n of c.nodes) if (n.type === 'OUTPUT') level.set(n.id, Math.max(maxLevel, level.get(n.id)!));
  const columns = new Map<number, CNode[]>();
  for (const n of c.nodes) columns.set(level.get(n.id)!, [...(columns.get(level.get(n.id)!) ?? []), n]);
  const pos = new Map<string, { x: number; y: number }>();
  const centerY = new Map<string, number>();
  [...columns.keys()].sort((a, b) => a - b).forEach(l => {
    const col = columns.get(l)!;
    const bary = (n: CNode) => {
      const ys: number[] = [];
      for (let p = 0; p < pinCount(n); p++) { const d = drivers.get(`${n.id}:${p}`); if (d && centerY.has(d)) ys.push(centerY.get(d)!); }
      return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Infinity;
    };
    col.sort((a, b) => (l === 0 ? (a.label < b.label ? -1 : 1) : (bary(a) - bary(b)) || (a.id < b.id ? -1 : 1)));
    let top = 30;
    for (const n of col) {
      const h = NODE_H(n);
      const wanted = Number.isFinite(bary(n)) ? bary(n) - h / 2 : top;
      const y = Math.max(top, wanted);
      pos.set(n.id, { x: 30 + l * 150, y });
      centerY.set(n.id, y + h / 2);
      top = y + h + 28;
    }
  });
  return { ...c, nodes: c.nodes.map(n => ({ ...n, ...(pos.get(n.id) ?? {}) })) };
};

/** Elimina compuertas que no alimentan ninguna salida (p. ej. inversores cancelados). */
export const pruneDead = (c: Circuit): Circuit => {
  const drivers = new Map<string, string[]>();
  for (const w of c.wires) drivers.set(w.to, [...(drivers.get(w.to) ?? []), w.from]);
  const alive = new Set<string>();
  const stack = c.nodes.filter(n => n.type === 'OUTPUT').map(n => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (alive.has(id)) continue;
    alive.add(id);
    stack.push(...(drivers.get(id) ?? []));
  }
  const keep = (n: CNode) => n.type === 'INPUT' || alive.has(n.id);
  const nodes = c.nodes.filter(keep);
  const ids = new Set(nodes.map(n => n.id));
  return { nodes, wires: c.wires.filter(w => ids.has(w.from) && ids.has(w.to)) };
};

// ───────────────────────── Construcción desde expresiones ─────────────────────────

const COMMUTATIVE = new Set<GateType>(['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR']);

class Builder {
  circuit: Circuit = emptyCircuit();
  private memo = new Map<string, string>();
  inputs = new Map<string, string>();
  /** inversor → señal original, para cancelar dobles inversiones */
  private inverts = new Map<string, string>();

  input(label: string) {
    let id = this.inputs.get(label);
    if (!id) {
      id = newId();
      this.circuit.nodes.push({ id, type: 'INPUT', x: 0, y: 0, label, pins: 0 });
      this.inputs.set(label, id);
    }
    return id;
  }

  gate(type: GateType, ins: string[]): string {
    const ordered = COMMUTATIVE.has(type) ? [...ins].sort() : ins;
    const key = `${type}|${ordered.join(',')}`;
    const hit = this.memo.get(key);
    if (hit) return hit;
    const id = newId();
    this.circuit.nodes.push({ id, type, x: 0, y: 0, label: '', pins: ins.length });
    ins.forEach((from, pin) => this.circuit.wires.push({ id: newId('w'), from, to: id, pin }));
    this.memo.set(key, id);
    return id;
  }

  not(x: string): string {
    const original = this.inverts.get(x);
    if (original) return original;
    const id = this.gate('NOT', [x]);
    this.inverts.set(id, x);
    return id;
  }

  /** Inversor construido con una compuerta universal con las entradas unidas. */
  notUniversal(style: 'NAND' | 'NOR', x: string): string {
    const original = this.inverts.get(x);
    if (original) return original;
    const id = this.gate(style, [x, x]);
    this.inverts.set(id, x);
    return id;
  }

  output(label: string, driver: string | null) {
    const id = newId();
    this.circuit.nodes.push({ id, type: 'OUTPUT', x: 0, y: 0, label, pins: 1 });
    if (driver) this.circuit.wires.push({ id: newId('w'), from: driver, to: id, pin: 0 });
  }
}

/** Reduce una lista de señales con compuertas de hasta 4 entradas. */
const reduceGroups = (type: 'AND' | 'OR', ids: string[], make: (type: 'AND' | 'OR', group: string[]) => string): string => {
  let list = [...new Set(ids)];
  if (list.length === 1) return list[0];
  while (list.length > MAX_PINS) {
    const next: string[] = [];
    for (let i = 0; i < list.length; i += MAX_PINS) {
      const group = list.slice(i, i + MAX_PINS);
      next.push(group.length === 1 ? group[0] : make(type, group));
    }
    list = next;
  }
  return make(type, list);
};

const flatten = (ast: Ast, type: 'AND' | 'OR'): Ast[] => (ast.type === type ? [...flatten(ast.left, type), ...flatten(ast.right, type)] : [ast]);

export const circuitFromAsts = (items: { name: string; ast: Ast }[]): Circuit => {
  const b = new Builder();
  const names = new Set<string>();
  for (const it of items) getVariables(it.ast).forEach(v => { if (v !== '0' && v !== '1') names.add(v); });
  [...names].sort().forEach(v => b.input(v));
  const emit = (ast: Ast): string | null => {
    switch (ast.type) {
      case 'VAR': return ast.name === '0' || ast.name === '1' ? null : b.input(ast.name);
      case 'NOT': {
        if (ast.child.type === 'NOT') return emit(ast.child.child);
        const k = emit(ast.child);
        return k && b.not(k);
      }
      case 'XOR': { const l = emit(ast.left); const r = emit(ast.right); return l && r ? b.gate('XOR', [l, r]) : null; }
      default: {
        const parts = flatten(ast, ast.type).map(emit);
        if (parts.some(p => p === null)) return null;
        return reduceGroups(ast.type, parts as string[], (t, g) => b.gate(t, g));
      }
    }
  };
  for (const it of items) b.output(it.name, emit(it.ast));
  return autoLayout(pruneDead(b.circuit));
};

/** `F = A+B*C; G = A^B` → circuito con una salida por cada asignación. */
export const circuitFromExpressions = (text: string, simplified = false): Circuit => {
  const parts = text.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Escribe al menos una expresión.');
  const items = parts.map((part, i) => {
    const m = part.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=(.*)$/);
    const name = m ? m[1] : parts.length === 1 ? 'F' : `F${i + 1}`;
    let ast = parseExpression(m ? m[2] : part);
    if (simplified) {
      const vars = [...getVariables(ast)].filter(v => v !== '0' && v !== '1').sort();
      if (vars.length <= MAX_TABLE_VARS) {
        const minterms: number[] = [];
        for (let r = 0; r < 2 ** vars.length; r++) {
          const env: Environment = Object.create(null);
          vars.forEach((v, j) => { env[v] = (r >> (vars.length - 1 - j)) & 1; });
          if (evaluateAst(ast, env) === 1) minterms.push(r);
        }
        ast = parseExpression(formatSOP(quineMcCluskey(minterms, vars.length), vars));
      }
    }
    return { name, ast };
  });
  return circuitFromAsts(items);
};

/** Reconstruye el circuito usando solo compuertas NAND o solo NOR. */
export const toUniversal = (src: Circuit, style: 'NAND' | 'NOR'): Circuit => {
  const b = new Builder();
  const drivers = driverMap(src);
  const byId = new Map(src.nodes.map(n => [n.id, n]));
  const mapped = new Map<string, string | null>();
  const U = (xs: string[]) => b.gate(style, xs);
  const N = (x: string) => b.notUniversal(style, x);
  // dual: con NAND, AND = NOT(NAND) y OR = NAND(NOTs); con NOR es al revés
  const and = (xs: string[]) => (style === 'NAND' ? N(U(xs)) : U(xs.map(N)));
  const or = (xs: string[]) => (style === 'NAND' ? U(xs.map(N)) : N(U(xs)));
  const xnor = (a: string, c: string) => {
    const n = U([a, c]);
    return style === 'NAND' ? N(U([U([a, n]), U([c, n])])) : U([U([a, n]), U([c, n])]);
  };
  const conv = (id: string): string | null => {
    if (mapped.has(id)) return mapped.get(id)!;
    const n = byId.get(id)!;
    let out: string | null = null;
    if (n.type === 'INPUT') out = b.input(n.label);
    else {
      const ins: string[] = [];
      let ok = true;
      for (let p = 0; p < pinCount(n); p++) { const d = drivers.get(`${id}:${p}`); const k = d ? conv(d) : null; if (k) ins.push(k); else ok = false; }
      if (ok) {
        switch (n.type) {
          case 'OUTPUT': out = ins[0]; break;
          case 'NOT': out = N(ins[0]); break;
          case 'AND': out = and(ins); break;
          case 'OR': out = or(ins); break;
          case 'NAND': out = style === 'NAND' ? U(ins) : N(and(ins)); break;
          case 'NOR': out = style === 'NOR' ? U(ins) : N(or(ins)); break;
          case 'XOR': { const x = xnor(ins[0], ins[1]); out = N(x); break; }
          case 'XNOR': out = xnor(ins[0], ins[1]); break;
        }
      }
    }
    mapped.set(id, out);
    return out;
  };
  for (const n of sortedInputs(src)) b.input(n.label);
  for (const o of src.nodes.filter(n => n.type === 'OUTPUT').sort((a, c) => (a.label < c.label ? -1 : 1))) b.output(o.label, conv(o.id));
  return autoLayout(pruneDead(b.circuit));
};

// ───────────────────────── Verificación (ejercicios) ─────────────────────────

export type OutputSpec = { name: string; expr: string };
export type CircuitCheck = {
  ok: boolean;
  messages: string[];
  mismatches: { output: string; env: Environment; got: Bit | null; expected: Bit }[];
  gates: number;
};

export const checkCircuit = (c: Circuit, spec: OutputSpec[], opts: { allowed?: GateType[]; maxGates?: number } = {}): CircuitCheck => {
  const messages: string[] = [];
  const mismatches: CircuitCheck['mismatches'] = [];
  const gatesNodes = c.nodes.filter(n => isGate(n.type));
  if (opts.allowed) {
    const bad = [...new Set(gatesNodes.filter(n => !opts.allowed!.includes(n.type)).map(n => n.type))];
    if (bad.length) messages.push(`Solo puedes usar ${opts.allowed.join(', ')}; quita: ${bad.join(', ')}.`);
  }
  if (opts.maxGates !== undefined && gatesNodes.length > opts.maxGates) messages.push(`Usa a lo más ${opts.maxGates} compuertas (tienes ${gatesNodes.length}).`);
  const inputsByLabel = new Map(c.nodes.filter(n => n.type === 'INPUT').map(n => [n.label, n.id]));
  for (const s of spec) {
    const out = c.nodes.find(n => n.type === 'OUTPUT' && n.label === s.name);
    if (!out) { messages.push(`Falta la salida ${s.name}.`); continue; }
    if (!driverMap(c).has(`${out.id}:0`)) { messages.push(`La salida ${s.name} no está conectada.`); continue; }
    const ast = parseExpression(s.expr);
    const vars = [...getVariables(ast)].filter(v => v !== '0' && v !== '1').sort();
    let bad = false;
    for (let r = 0; r < 2 ** vars.length && !bad; r++) {
      const env: Environment = Object.create(null);
      const bits: Record<string, Bit> = {};
      vars.forEach((v, j) => { const bit = ((r >> (vars.length - 1 - j)) & 1) as Bit; env[v] = bit; const id = inputsByLabel.get(v); if (id) bits[id] = bit; });
      const expected = evaluateAst(ast, env);
      const got = simulate(c, bits).get(out.id) ?? null;
      if (got !== expected) { mismatches.push({ output: s.name, env, got, expected }); bad = true; }
    }
  }
  const ok = !messages.length && !mismatches.length;
  return { ok, messages, mismatches, gates: gatesNodes.length };
};

export const serializeCircuit = (c: Circuit) => JSON.stringify({ version: 1, ...c }, null, 2);

export const parseCircuit = (text: string): Circuit => {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.wires)) throw new Error('Archivo de circuito inválido.');
  const types = new Set<string>(['INPUT', 'OUTPUT', ...GATE_TYPES]);
  const nodes: CNode[] = data.nodes.filter((n: CNode) => n && typeof n.id === 'string' && types.has(n.type)).map((n: CNode) => ({
    id: String(n.id), type: n.type, x: Number(n.x) || 0, y: Number(n.y) || 0, label: String(n.label ?? '').slice(0, 24), pins: Number(n.pins) || 2,
  }));
  const ids = new Set(nodes.map(n => n.id));
  const wires: CWire[] = data.wires.filter((w: CWire) => w && ids.has(w.from) && ids.has(w.to)).map((w: CWire) => ({ id: String(w.id ?? newId('w')), from: w.from, to: w.to, pin: Number(w.pin) || 0 }));
  return pruneWires({ nodes, wires });
};
