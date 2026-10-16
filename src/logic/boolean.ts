export type Bit = 0 | 1;
export type Environment = Record<string, number>;
export type Ast = { type: 'VAR'; name: string; value?: Bit } | { type: 'NOT'; child: Ast; value?: Bit } | { type: 'AND' | 'OR' | 'XOR'; left: Ast; right: Ast; value?: Bit };
type Token = { type: string; val: string };
type Literal = { varIdx: number; isNot: boolean };
export type QmResult = { terms: Literal[][]; isZero?: boolean; isOne?: boolean };

export const tokenize = (expr: string): Token[] => {
  if (expr.length > 2000) throw new Error('La expresión supera el límite de 2000 caracteres.');
  if (expr.includes('=')) {
    const assignment = expr.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=([^=]+)$/);
    if (!assignment) throw new Error('Asignación inválida. Usa F = expresión.');
    expr = assignment[1];
  }
  const tokens = [];
  const regex = /([a-zA-Z_][a-zA-Z0-9_]*|[01])|([+*·^!'()])|(\s+)/gy;
  let match;
  let position = 0;

  while ((match = regex.exec(expr)) !== null) {
    position = regex.lastIndex;
    if (match[3]) continue; // ignorar espacios
    if (match[1]) {
      const upper = match[1].toUpperCase();
      if (upper === 'AND') tokens.push({ type: 'OP', val: '*' });
      else if (upper === 'OR') tokens.push({ type: 'OP', val: '+' });
      else if (upper === 'XOR') tokens.push({ type: 'OP', val: '^' });
      else if (upper === 'NOT') tokens.push({ type: 'OP', val: '!' });
      else tokens.push({ type: 'VAR', val: match[1] });
    } else if (match[2]) {
      let val = match[2];
      if (val === '·') val = '*';
      tokens.push({ type: val === "'" || val === "!" || val === "(" || val === ")" ? val : 'OP', val: val });
    }
  }
  if (position !== expr.length) throw new Error(`Símbolo no válido: '${expr[position]}'.`);
  return tokens;
};

export class Parser {
  tokens: Token[];
  pos: number;
  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }

  parse(): Ast {
    if (this.tokens.length === 0) throw new Error("Expresión vacía.");
    const ast = this.parseOr();
    if (this.pos < this.tokens.length) throw new Error(`Tokens inesperados al final: '${this.peek().val}'`);
    return ast;
  }

  parseOr(): Ast {
    let left = this.parseXor();
    while (this.peek() && this.peek().val === '+') {
      this.consume();
      left = { type: 'OR', left, right: this.parseXor() };
    }
    return left;
  }

  parseXor(): Ast {
    let left = this.parseAnd();
    while (this.peek() && this.peek().val === '^') {
      this.consume();
      left = { type: 'XOR', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd(): Ast {
    let left = this.parseNot();
    while (this.peek() && this.peek().val === '*') {
      this.consume();
      left = { type: 'AND', left, right: this.parseNot() };
    }
    return left;
  }

  parseNot(): Ast {
    if (this.peek() && this.peek().val === '!') {
      this.consume();
      return { type: 'NOT', child: this.parseNot() };
    }
    let node = this.parsePrimary();
    while (this.peek() && this.peek().val === "'") {
      this.consume();
      node = { type: 'NOT', child: node };
    }
    return node;
  }

  parsePrimary(): Ast {
    const tk = this.consume();
    if (!tk) throw new Error("Expresión incompleta.");
    if (tk.type === 'VAR') return { type: 'VAR', name: tk.val };
    if (tk.val === '(') {
      const node = this.parseOr();
      const closeTk = this.consume();
      if (!closeTk || closeTk.val !== ')') throw new Error("Falta paréntesis de cierre ')'.");
      return node;
    }
    throw new Error(`Token inesperado: '${tk.val}'`);
  }
}

export const getVariables = (node: Ast, vars = new Set<string>()) => {
  if (!node) return vars;
  if (node.type === 'VAR') {
    if (node.name !== '0' && node.name !== '1') vars.add(node.name);
  }
  else if (node.type === 'NOT') getVariables(node.child, vars);
  else {
    getVariables(node.left, vars);
    getVariables(node.right, vars);
  }
  return vars;
};

export const evaluateAst = (node: Ast, env: Environment): Bit => {
  switch (node.type) {
    case 'VAR': return node.name === '1' ? 1 : node.name === '0' ? 0 : env[node.name] ? 1 : 0;
    case 'NOT': return evaluateAst(node.child, env) ? 0 : 1;
    case 'AND': return (evaluateAst(node.left, env) && evaluateAst(node.right, env)) ? 1 : 0;
    case 'OR': return (evaluateAst(node.left, env) || evaluateAst(node.right, env)) ? 1 : 0;
    case 'XOR': return (evaluateAst(node.left, env) !== evaluateAst(node.right, env)) ? 1 : 0;
    default: return 0;
  }
};

// Nueva función para evaluar y etiquetar nodos del AST para la visualización
export const annotateAstWithValues = (node: Ast, env: Environment): Ast => {
    const newNode = { ...node };

    if (newNode.type === 'VAR') {
        newNode.value = evaluateAst(newNode, env);
    } else if (newNode.type === 'NOT') {
        newNode.child = annotateAstWithValues(newNode.child, env);
        newNode.value = newNode.child.value ? 0 : 1;
    } else {
        newNode.left = annotateAstWithValues(newNode.left, env);
        newNode.right = annotateAstWithValues(newNode.right, env);
        if (newNode.type === 'AND') newNode.value = (newNode.left.value && newNode.right.value) ? 1 : 0;
        if (newNode.type === 'OR') newNode.value = (newNode.left.value || newNode.right.value) ? 1 : 0;
        if (newNode.type === 'XOR') newNode.value = (newNode.left.value !== newNode.right.value) ? 1 : 0;
    }
    return newNode;
};


// ==========================================
// 2. ALGORITMO QUINE-MCCLUSKEY (Q-M)
// ==========================================

class Implicant {
  val: number;
  dashes: number;
  minterms: number[];
  used: boolean;
  constructor(val: number, dashes: number, minterms: number[]) {
    this.val = val;
    this.dashes = dashes;
    this.minterms = minterms;
    this.used = false;
  }
  canCombine(other: Implicant) {
    if (this.dashes !== other.dashes) return false;
    let diff = this.val ^ other.val;
    return diff !== 0 && (diff & (diff - 1)) === 0;
  }
  combine(other: Implicant) {
    let diff = this.val ^ other.val;
    return new Implicant(
      this.val & ~diff,
      this.dashes | diff,
      [...new Set([...this.minterms, ...other.minterms])].sort((a, b) => a - b)
    );
  }
}

export const quineMcCluskey = (minterms: number[], numVars: number): QmResult => {
  if (minterms.length === 0) return { terms: [], isZero: true };
  if (minterms.length === Math.pow(2, numVars)) return { terms: [], isOne: true };

  let groups: Implicant[][] = Array.from({ length: numVars + 1 }, () => []);
  minterms.forEach(m => {
    let ones = m.toString(2).split('1').length - 1;
    groups[ones].push(new Implicant(m, 0, [m]));
  });

  let primeImplicants: Implicant[] = [];
  let combined = true;

  while (combined) {
    combined = false;
    let nextGroups: Implicant[][] = Array.from({ length: numVars + 1 }, () => []);
    let currentPrimes = [];

    for (let i = 0; i < groups.length - 1; i++) {
      for (let imp1 of groups[i]) {
        for (let imp2 of groups[i + 1]) {
          if (imp1.canCombine(imp2)) {
            let newImp = imp1.combine(imp2);
            imp1.used = true;
            imp2.used = true;
            combined = true;

            // Avoid duplicates
            if (!nextGroups[i].some(x => x.val === newImp.val && x.dashes === newImp.dashes)) {
              nextGroups[i].push(newImp);
            }
          }
        }
      }
    }

    // Collect unused implicants as primes
    for (let group of groups) {
      for (let imp of group) {
        if (!imp.used) currentPrimes.push(imp);
      }
    }
    primeImplicants.push(...currentPrimes);
    groups = nextGroups.filter(g => g.length > 0);
  }

  // Remove duplicates from prime implicants
  primeImplicants = primeImplicants.filter((v, i, a) => a.findIndex(t => (t.val === v.val && t.dashes === v.dashes)) === i);

  // Essential Prime Implicants (Greedy Cover for simplicity and speed in JS)
  let uncoveredMinterms = new Set(minterms);
  let finalCover: Implicant[] = [];

  // Find essentials
  for (let m of minterms) {
    let covering = primeImplicants.filter(p => p.minterms.includes(m));
    if (covering.length === 1) {
      if (!finalCover.includes(covering[0])) {
        finalCover.push(covering[0]);
        covering[0].minterms.forEach(mt => uncoveredMinterms.delete(mt));
      }
    }
  }

  // Greedy cover for the rest
  while (uncoveredMinterms.size > 0) {
    let bestImp: Implicant | null = null;
    let bestCount = -1;
    for (let imp of primeImplicants) {
      if (finalCover.includes(imp)) continue;
      let count = imp.minterms.filter(m => uncoveredMinterms.has(m)).length;
      if (count > bestCount) {
        bestCount = count;
        bestImp = imp;
      }
    }
    if (bestImp) {
      finalCover.push(bestImp);
      bestImp.minterms.forEach(m => uncoveredMinterms.delete(m));
    } else break; // Should not happen in pure logic, but safe fallback
  }

  // Convert to algebraic terms
  let algebraicTerms = finalCover.map(imp => {
    let termLits = [];
    for (let i = 0; i < numVars; i++) {
      let mask = 1 << ((numVars - 1) - i);
      if ((imp.dashes & mask) === 0) {
        termLits.push({ varIdx: i, isNot: (imp.val & mask) === 0 });
      }
    }
    return termLits;
  });

  return { terms: algebraicTerms, isZero: false, isOne: false };
};

// ==========================================
// 2.5 TRANSFORMADORES MATEMÁTICOS
// ==========================================

export const formatSOP = (qmResult: QmResult, varNames: string[]) => {
  if (qmResult.isZero) return "0";
  if (qmResult.isOne) return "1";

  return qmResult.terms.map(term => {
    if (term.length === 0) return "1";
    return term.map(lit => varNames[lit.varIdx] + (lit.isNot ? "'" : "")).join('*');
  }).join(' + ');
};

export const formatPOS = (qmSopOfComplement: QmResult, varNames: string[]) => {
    // Al pasarle los maxterms a Q-M, nos devuelve la SOP mínima de F'.
    // Aplicamos el Teorema de De Morgan de forma algorítmica: F = (F')'
    // Convertimos ANDs a ORs, ORs a ANDs, e invertimos los literales.
    if (qmSopOfComplement.isZero) return "1"; // Si F'=0, F=1
    if (qmSopOfComplement.isOne) return "0";  // Si F'=1, F=0

    return qmSopOfComplement.terms.map(term => {
        let sumStr = term.map(lit => varNames[lit.varIdx] + (!lit.isNot ? "'" : "")).join(' + ');
        return `(${sumStr})`;
    }).join(' * ');
};

export const buildNandFromSOP = (qmSOP: QmResult, varNames: string[]) => {
    // Para resolver constantes correctamente usando solo compuertas universales
    const v0 = varNames[0] || 'A';
    const CONST_1 = `(${v0} NAND (${v0} NAND ${v0}))`;
    const CONST_0 = `(${CONST_1} NAND ${CONST_1})`;

    if (qmSOP.isZero) return CONST_0;
    if (qmSOP.isOne) return CONST_1;

    let termNands = qmSOP.terms.map(term => {
        let lits = term.map(lit => {
            let v = varNames[lit.varIdx];
            return lit.isNot ? `(${v} NAND ${v})` : v;
        });

        if (lits.length === 1) {
            // Si el término en la SOP solo tiene un literal (ej. F = A + BC)
            // se necesita una doble inversión para que se ensamble correctamente en el nivel final NAND.
            return `(${lits[0]} NAND ${lits[0]})`;
        } else {
            return `(${lits.join(' NAND ')})`;
        }
    });

    if (termNands.length === 1) {
        // Expresión de un solo término (ej. F = AB)
        let term = qmSOP.terms[0];
        if (term.length === 1) {
            // F = A ó F = A'
            let v = varNames[term[0].varIdx];
            return term[0].isNot ? `(${v} NAND ${v})` : v;
        } else {
            // Necesitamos la compuerta final para invertir el AB' y tener AB
            return `(${termNands[0]} NAND ${termNands[0]})`;
        }
    } else {
        return `(${termNands.join(' NAND ')})`;
    }
};

export const buildNorFromPOS = (qmSopOfComplement: QmResult, varNames: string[]) => {
    const v0 = varNames[0] || 'A';
    const CONST_0 = `(${v0} NOR (${v0} NOR ${v0}))`;
    const CONST_1 = `(${CONST_0} NOR ${CONST_0})`;

    if (qmSopOfComplement.isZero) return CONST_1;
    if (qmSopOfComplement.isOne) return CONST_0;

    let termNors = qmSopOfComplement.terms.map(term => {
        let lits = term.map(lit => {
            let v = varNames[lit.varIdx];
            return !lit.isNot ? `(${v} NOR ${v})` : v;
        });

        if (lits.length === 1) {
            return `(${lits[0]} NOR ${lits[0]})`;
        } else {
            return `(${lits.join(' NOR ')})`;
        }
    });

    if (termNors.length === 1) {
        let term = qmSopOfComplement.terms[0];
        if (term.length === 1) {
            let v = varNames[term[0].varIdx];
            return !term[0].isNot ? `(${v} NOR ${v})` : v;
        } else {
            return `(${termNors[0]} NOR ${termNors[0]})`;
        }
    } else {
        return `(${termNors.join(' NOR ')})`;
    }
};


// ==========================================
// 3. GENERACIÓN DE DIAGRAMAS
// ==========================================

export const generateAsciiTree = (node: Ast, prefix = "", isLeft = true): string => {
  if (!node) return "";
  let result = prefix + (prefix === "" ? "" : (isLeft ? "├── " : "└── "));

  let valStr = node.value !== undefined ? ` [=${node.value}]` : "";

  if (node.type === 'VAR') {
    result += node.name + valStr + "\n";
  } else if (node.type === 'NOT') {
    result += "NOT" + valStr + "\n";
    result += generateAsciiTree(node.child, prefix + (isLeft ? "│   " : "    "), false);
  } else {
    result += node.type + valStr + "\n";
    let newPrefix = prefix + (isLeft ? "│   " : "    ");
    result += generateAsciiTree(node.left, newPrefix, true);
    result += generateAsciiTree(node.right, newPrefix, false);
  }
  return result;
};

export const generateDotGraph = (node: Ast): string => {
    let counter = 0;
    let edges: string[] = [];
    let nodes: string[] = [];

    const traverse = (n: Ast): string => {
        let id = `node${counter++}`;
        let valStr = n.value !== undefined ? `\\n[=${n.value}]` : "";

        if (n.type === 'VAR') {
            nodes.push(`${id} [label="${n.name}${valStr}", shape=circle, style=filled, fillcolor=lightyellow];`);
        } else if (n.type === 'NOT') {
            nodes.push(`${id} [label="NOT${valStr}", shape=invtriangle];`);
            let childId = traverse(n.child);
            edges.push(`${childId} -> ${id};`);
        } else {
            nodes.push(`${id} [label="${n.type}${valStr}", shape=box, style=rounded, fillcolor=lightblue];`);
            let leftId = traverse(n.left);
            let rightId = traverse(n.right);
            edges.push(`${leftId} -> ${id};`);
            edges.push(`${rightId} -> ${id};`);
        }
        return id;
    };

    let rootId = traverse(node);
    nodes.push(`output [label="Salida", shape=plaintext];`);
    edges.push(`${rootId} -> output;`);

    return `digraph LogicCircuit {\n  rankdir=LR;\n  node [fontname="Helvetica"];\n  ${nodes.join('\n  ')}\n  ${edges.join('\n  ')}\n}`;
};

export function calculateExpression(input: string) {
      // 1. Parsear
      const tokens = tokenize(input);
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // 2. Extraer variables
      let varsSet = getVariables(ast);
      let varNames = Array.from(varsSet).sort();


      let numVars = varNames.length;
      let isTooBig = numVars > 12;

      // 3. Generar Tabla de Verdad
      let numRows = Math.pow(2, Math.min(numVars, 12));
      let minterms: number[] = [];
      let maxterms: number[] = [];
      let table: { env: Environment; result: Bit }[] = [];

      let originalEvaluations: Bit[] = [];

      if (!isTooBig) {
        for (let i = 0; i < numRows; i++) {
          let env: Environment = Object.create(null);
          let binaryStr = i.toString(2).padStart(numVars, '0');
          for (let j = 0; j < numVars; j++) {
            env[varNames[j]] = parseInt(binaryStr[j], 10);
          }
          let result = evaluateAst(ast, env);
          table.push({ env, result });
          originalEvaluations.push(result);

          if (result === 1) minterms.push(i);
          else maxterms.push(i);
        }
      }

      // 4. Simplificación y Transformaciones Exactas
      let sopStr = "";
      let posStr = "";
      let nandOnly = "";
      let norOnly = "";
      let isExact = false;
      let isValidated = false;

      if (!isTooBig) {
        let qmSOP = quineMcCluskey(minterms, numVars);
        sopStr = formatSOP(qmSOP, varNames);

        let qmSopOfComplement = quineMcCluskey(maxterms, numVars);
        posStr = formatPOS(qmSopOfComplement, varNames);

        nandOnly = buildNandFromSOP(qmSOP, varNames);
        norOnly = buildNorFromPOS(qmSopOfComplement, varNames);

        isExact = true;

        try {
            const testTokens = tokenize(sopStr);
            const testAst = new Parser(testTokens).parse();
            let testPassed = true;
            for (let i = 0; i < numRows; i++) {
                 let env = table[i].env;
                 if (evaluateAst(testAst, env) !== originalEvaluations[i]) {
                     testPassed = false;
                     break;
                 }
            }
            isValidated = testPassed;
        } catch (e) {
            isValidated = false;
        }
      } else {
        sopStr = "La expresión tiene demasiadas variables (>12) para simplificación exacta en el navegador.";
        posStr = "N/A";
        nandOnly = "N/A";
        norOnly = "N/A";
      }

      // 5. Formas Canónicas Originales
      let canSOP = !isTooBig ? `Σ m(${minterms.join(', ')})` : "Demasiadas variables";
      let canPOS = !isTooBig ? `Π M(${maxterms.join(', ')})` : "Demasiadas variables";

      return {
        ast,
        variables: varNames,
        table,
        minterms,
        maxterms,
        isTooBig,
        sop: sopStr,
        pos: posStr,
        canSOP,
        canPOS,
        nandOnly,
        norOnly,
        isExact,
        isValidated
      };
}
export type CalculationResult = ReturnType<typeof calculateExpression>;
