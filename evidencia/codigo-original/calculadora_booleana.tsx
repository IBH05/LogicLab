import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, AlertTriangle, BookOpen, Calculator, Play, Info } from 'lucide-react';

// ==========================================
// 1. MOTOR LÓGICO: ANALIZADOR Y EVALUADOR
// ==========================================

const tokenize = (expr) => {
  if (expr.includes('=')) expr = expr.split('=').pop(); // Ignorar parte de asignación
  const tokens = [];
  const regex = /([a-zA-Z_][a-zA-Z0-9_]*)|([+*·^!'()])|(\s+)/g;
  let match;
  
  while ((match = regex.exec(expr)) !== null) {
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
  return tokens;
};

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }

  parse() {
    if (this.tokens.length === 0) throw new Error("Expresión vacía.");
    const ast = this.parseOr();
    if (this.pos < this.tokens.length) throw new Error(`Tokens inesperados al final: '${this.peek().val}'`);
    return ast;
  }

  parseOr() {
    let left = this.parseXor();
    while (this.peek() && this.peek().val === '+') {
      this.consume();
      left = { type: 'OR', left, right: this.parseXor() };
    }
    return left;
  }

  parseXor() {
    let left = this.parseAnd();
    while (this.peek() && this.peek().val === '^') {
      this.consume();
      left = { type: 'XOR', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.peek() && this.peek().val === '*') {
      this.consume();
      left = { type: 'AND', left, right: this.parseNot() };
    }
    return left;
  }

  parseNot() {
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

  parsePrimary() {
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

const getVariables = (node, vars = new Set()) => {
  if (!node) return vars;
  if (node.type === 'VAR') vars.add(node.name);
  else if (node.type === 'NOT') getVariables(node.child, vars);
  else {
    getVariables(node.left, vars);
    getVariables(node.right, vars);
  }
  return vars;
};

const evaluateAst = (node, env) => {
  switch (node.type) {
    case 'VAR': return env[node.name] ? 1 : 0;
    case 'NOT': return evaluateAst(node.child, env) ? 0 : 1;
    case 'AND': return (evaluateAst(node.left, env) && evaluateAst(node.right, env)) ? 1 : 0;
    case 'OR': return (evaluateAst(node.left, env) || evaluateAst(node.right, env)) ? 1 : 0;
    case 'XOR': return (evaluateAst(node.left, env) !== evaluateAst(node.right, env)) ? 1 : 0;
    default: return 0;
  }
};

// Nueva función para evaluar y etiquetar nodos del AST para la visualización
const annotateAstWithValues = (node, env) => {
    if (!node) return null;
    const newNode = { ...node };

    if (newNode.type === 'VAR') {
        newNode.value = env[newNode.name] ? 1 : 0;
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
  constructor(val, dashes, minterms) {
    this.val = val;
    this.dashes = dashes;
    this.minterms = minterms;
    this.used = false;
  }
  canCombine(other) {
    if (this.dashes !== other.dashes) return false;
    let diff = this.val ^ other.val;
    return diff !== 0 && (diff & (diff - 1)) === 0;
  }
  combine(other) {
    let diff = this.val ^ other.val;
    return new Implicant(
      this.val & ~diff,
      this.dashes | diff,
      [...new Set([...this.minterms, ...other.minterms])].sort((a, b) => a - b)
    );
  }
}

const quineMcCluskey = (minterms, numVars) => {
  if (minterms.length === 0) return { terms: [], isZero: true };
  if (minterms.length === Math.pow(2, numVars)) return { terms: [], isOne: true };

  let groups = Array.from({ length: numVars + 1 }, () => []);
  minterms.forEach(m => {
    let ones = m.toString(2).split('1').length - 1;
    groups[ones].push(new Implicant(m, 0, [m]));
  });

  let primeImplicants = [];
  let combined = true;

  while (combined) {
    combined = false;
    let nextGroups = Array.from({ length: numVars + 1 }, () => []);
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
  let finalCover = [];

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
    let bestImp = null;
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

const formatSOP = (qmResult, varNames) => {
  if (qmResult.isZero) return "0";
  if (qmResult.isOne) return "1";
  
  return qmResult.terms.map(term => {
    if (term.length === 0) return "1"; 
    return term.map(lit => varNames[lit.varIdx] + (lit.isNot ? "'" : "")).join('*');
  }).join(' + ');
};

const formatPOS = (qmSopOfComplement, varNames) => {
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

const buildNandFromSOP = (qmSOP, varNames) => {
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

const buildNorFromPOS = (qmSopOfComplement, varNames) => {
    const v0 = varNames[0] || 'A';
    const CONST_0 = `(${v0} NOR (${v0} NOR ${v0}))`;
    const CONST_1 = `(${CONST_0} NOR ${CONST_0})`;
    
    if (qmSopOfComplement.isZero) return CONST_1; 
    if (qmSopOfComplement.isOne) return CONST_0;

    let termNors = qmSopOfComplement.terms.map(term => {
        let lits = term.map(lit => {
            let v = varNames[lit.varIdx];
            // Dado que derivamos del complemento, isNot true significa que el literal original era A'.
            // En NOR puro, A' se representa como (A NOR A)
            return lit.isNot ? `(${v} NOR ${v})` : v;
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
            return term[0].isNot ? `(${v} NOR ${v})` : v;
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

const generateAsciiTree = (node, prefix = "", isLeft = true) => {
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

const generateDotGraph = (node) => {
    let counter = 0;
    let edges = [];
    let nodes = [];

    const traverse = (n) => {
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

// ==========================================
// 3.5 VISUALIZADOR DE CIRCUITOS (SVG)
// ==========================================

const optimizeForVisualization = (node) => {
  if (!node) return null;
  
  // Mantenemos el valor de propagación
  const baseNode = { ...node };

  if (node.type === 'VAR') return baseNode;

  if (node.type === 'NOT') {
    const child = optimizeForVisualization(node.child);
    if (child.type === 'AND') return { ...baseNode, type: 'NAND', left: child.left, right: child.right };
    if (child.type === 'OR') return { ...baseNode, type: 'NOR', left: child.left, right: child.right };
    if (child.type === 'XOR') return { ...baseNode, type: 'XNOR', left: child.left, right: child.right };
    return { ...baseNode, type: 'NOT', child: child };
  }

  return {
    ...baseNode,
    type: node.type,
    left: optimizeForVisualization(node.left),
    right: optimizeForVisualization(node.right)
  };
};

const LogicGateNode = ({ node }) => {
    const { x, y, type, value } = node;
    const hasValue = value !== undefined;
    
    if (type === 'VAR') {
        return (
            <g transform={`translate(${x - 20}, ${y - 12})`}>
                <rect x="0" y="0" width="40" height="24" rx="12" fill={hasValue ? (value === 1 ? '#dcfce7' : '#fee2e2') : '#fef08a'} stroke={hasValue ? (value === 1 ? '#22c55e' : '#ef4444') : '#eab308'} strokeWidth="2" />
                <text x="20" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill={hasValue ? (value === 1 ? '#166534' : '#991b1b') : '#854d0e'}>{node.name}</text>
                
                {/* Visualización de valor de salida */}
                {hasValue && (
                     <text x="50" y="-2" textAnchor="middle" fontSize="10" fontWeight="bold" fill={value === 1 ? '#16a34a' : '#dc2626'}>{value}</text>
                )}
            </g>
        );
    }

    const gateEnds = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };
    const endX = gateEnds[type] || 35;

    // Color del cuerpo de la compuerta basado en la salida
    let gateFill = "white";
    let gateStroke = "currentColor";
    if (hasValue) {
        gateStroke = value === 1 ? '#22c55e' : '#ef4444';
        gateFill = value === 1 ? '#f0fdf4' : '#fef2f2';
    }

    return (
        <g transform={`translate(${x - 20}, ${y - 15})`} className="text-slate-800">
            {/* Cuerpos de las Compuertas */}
            {type === 'AND' && <path d="M 0,2 L 20,2 A 13,13 0 0 1 20,28 L 0,28 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />}
            {type === 'NAND' && (
                <><path d="M 0,2 L 20,2 A 13,13 0 0 1 20,28 L 0,28 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />
                <circle cx="36" cy="15" r="3" fill={gateFill} stroke={gateStroke} strokeWidth="2" /></>
            )}
            {type === 'OR' && <path d="M 0,2 Q 15,2 28,15 Q 15,28 0,28 Q 8,15 0,2 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />}
            {type === 'NOR' && (
                <><path d="M 0,2 Q 15,2 28,15 Q 15,28 0,28 Q 8,15 0,2 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />
                <circle cx="31" cy="15" r="3" fill={gateFill} stroke={gateStroke} strokeWidth="2" /></>
            )}
            {type === 'XOR' && (
                <><path d="M 0,2 Q 8,15 0,28" fill="none" stroke={gateStroke} strokeWidth="2" />
                <path d="M 6,2 Q 21,2 34,15 Q 21,28 6,28 Q 14,15 6,2 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" /></>
            )}
            {type === 'XNOR' && (
                <><path d="M 0,2 Q 8,15 0,28" fill="none" stroke={gateStroke} strokeWidth="2" />
                <path d="M 6,2 Q 21,2 34,15 Q 21,28 6,28 Q 14,15 6,2 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />
                <circle cx="37" cy="15" r="3" fill={gateFill} stroke={gateStroke} strokeWidth="2" /></>
            )}
            {type === 'NOT' && (
                <><path d="M 0,5 L 25,15 L 0,25 Z" fill={gateFill} stroke={gateStroke} strokeWidth="2" />
                <circle cx="28" cy="15" r="3" fill={gateFill} stroke={gateStroke} strokeWidth="2" /></>
            )}

            {/* Visualización de valor de salida en el pin derecho */}
            {hasValue && (
                <text x={endX + 15} y="10" textAnchor="middle" fontSize="10" fontWeight="bold" fill={value === 1 ? '#16a34a' : '#dc2626'}>{value}</text>
            )}
        </g>
    );
};

const SvgLogicCircuit = ({ ast }) => {
  const visualAst = useMemo(() => optimizeForVisualization(ast), [ast]);
  
  const { nodes, lines, width, height } = useMemo(() => {
     if (!visualAst) return { nodes: [], lines: [], width: 0, height: 0 };
     
     const LAYER_WIDTH = 130;
     const SLOT_HEIGHT = 45;
     
     const computeLayer = (n) => {
         if (n.type === 'VAR') return n.layer = 0;
         if (n.type === 'NOT') return n.layer = computeLayer(n.child) + 1;
         return n.layer = Math.max(computeLayer(n.left), computeLayer(n.right)) + 1;
     };
     const maxLayer = computeLayer(visualAst);
     
     const computeSlots = (n) => {
         if (n.type === 'VAR') return n.slots = 1;
         if (n.type === 'NOT') return n.slots = computeSlots(n.child);
         return n.slots = computeSlots(n.left) + computeSlots(n.right);
     };
     const totalSlots = computeSlots(visualAst);
     
     const nodesList = [];
     const linesList = [];
     
     const build = (n, yMin, yMax) => {
         const y = (yMin + yMax) / 2;
         const x = 50 + n.layer * LAYER_WIDTH;
         n.x = x;
         n.y = y;
         nodesList.push(n);
         
         const gateEnds = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };
         
         if (n.type === 'VAR') {
             // hoja (no children)
         } else if (n.type === 'NOT' || n.type === 'NAND' || n.type === 'NOR' || n.type === 'XNOR') {
             if(n.type === 'NOT') {
                 build(n.child, yMin, yMax);
                 let srcX = n.child.x - 20 + (gateEnds[n.child.type] || 40); // Ajuste dinámico de salida
                 if(n.child.type === 'VAR') srcX = n.child.x + 20;
                 linesList.push({
                     x1: srcX, y1: n.child.y,
                     x2: x - 30, y2: y,
                     val: n.child.value
                 });
             } else {
                 const leftRatio = n.left.slots / n.slots;
                 const yMid = yMin + (yMax - yMin) * leftRatio;
                 build(n.left, yMin, yMid);
                 build(n.right, yMid, yMax);
                 
                 let srcXLeft = n.left.x - 20 + (gateEnds[n.left.type] || 40);
                 if(n.left.type === 'VAR') srcXLeft = n.left.x + 20;
                 linesList.push({ x1: srcXLeft, y1: n.left.y, x2: x - 30, y2: y - 5, val: n.left.value });
                 
                 let srcXRight = n.right.x - 20 + (gateEnds[n.right.type] || 40);
                 if(n.right.type === 'VAR') srcXRight = n.right.x + 20;
                 linesList.push({ x1: srcXRight, y1: n.right.y, x2: x - 30, y2: y + 5, val: n.right.value });
             }
         } else {
             const leftRatio = n.left.slots / n.slots;
             const yMid = yMin + (yMax - yMin) * leftRatio;
             build(n.left, yMin, yMid);
             build(n.right, yMid, yMax);
             
             let srcXLeft = n.left.x - 20 + (gateEnds[n.left.type] || 40);
             if(n.left.type === 'VAR') srcXLeft = n.left.x + 20;
             linesList.push({ x1: srcXLeft, y1: n.left.y, x2: x - 30, y2: y - 5, val: n.left.value });
             
             let srcXRight = n.right.x - 20 + (gateEnds[n.right.type] || 40);
             if(n.right.type === 'VAR') srcXRight = n.right.x + 20;
             linesList.push({ x1: srcXRight, y1: n.right.y, x2: x - 30, y2: y + 5, val: n.right.value });
         }
     };
     
     build(visualAst, 0, totalSlots * SLOT_HEIGHT);
     
     const finalGateEnd = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };
     let srcXFinal = visualAst.x - 20 + (finalGateEnd[visualAst.type] || 40);
     if(visualAst.type === 'VAR') srcXFinal = visualAst.x + 20;
     
     linesList.push({
         x1: srcXFinal, y1: visualAst.y,
         x2: visualAst.x + 70, y2: visualAst.y,
         val: visualAst.value
     });
     
     return {
         nodes: nodesList,
         lines: linesList,
         width: (maxLayer + 1.5) * LAYER_WIDTH,
         height: totalSlots * SLOT_HEIGHT
     };
  }, [visualAst]);

  const drawLine = (l, i) => {
      const midX = l.x2 - 15; // Quiebre vertical justo antes de entrar a la compuerta
      const d = `M ${l.x1},${l.y1} L ${midX},${l.y1} L ${midX},${l.y2} L ${l.x2},${l.y2}`;
      
      // Color condicional para evaluación de propagación
      let strokeColor = "#cbd5e1"; // Color base (gris) si no hay valores
      if (l.val !== undefined) {
          strokeColor = l.val === 1 ? '#22c55e' : '#ef4444'; // Verde para 1, Rojo para 0
      }

      return <path key={i} d={d} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
     <div className="overflow-auto bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-6 custom-scrollbar relative">
         <svg width={width} height={height} className="min-w-full">
             {lines.map((l, i) => drawLine(l, i))}
             {nodes.map((n, i) => <LogicGateNode key={i} node={n} />)}
             
             {/* Etiqueta final */}
             <text x={visualAst?.x + 75} y={visualAst?.y + 4} fontSize="12" fontWeight="bold" fill={visualAst?.value === 1 ? '#16a34a' : (visualAst?.value === 0 ? '#dc2626' : '#334155')}>Salida</text>
             {visualAst?.value !== undefined && (
                <rect x={visualAst?.x + 70} y={visualAst?.y - 18} width="20" height="14" rx="4" fill={visualAst.value === 1 ? '#dcfce7' : '#fee2e2'} stroke={visualAst.value === 1 ? '#22c55e' : '#ef4444'} strokeWidth="1" />
             )}
         </svg>
     </div>
  );
};

// ==========================================
// 4. COMPONENTES DE UI
// ==========================================

const copyToClipboard = (text, setCopied) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  } else {
    // Fallback
    let textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar', err);
    }
    textArea.remove();
  }
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button 
      onClick={() => copyToClipboard(text, setCopied)}
      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
      title="Copiar al portapapeles"
    >
      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
    </button>
  );
};

// COMPONENTE PRINCIPAL APP
export default function App() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('truth');
  const [showRules, setShowRules] = useState(false);
  
  // Nuevo estado para la evaluación en tiempo real del diagrama
  const [selectedEvaluationIndex, setSelectedEvaluationIndex] = useState(-1);
  const [annotatedAst, setAnnotatedAst] = useState(null);

  const inputRef = useRef(null);

  const ejemplos = [
    { label: "Ejemplo 1 (SOP básico)", expr: "D = Pwr * (H + R) * B" },
    { label: "Ejemplo 2 (De Morgan)", expr: "Rpluma = (S * P)' + A * C'" },
    { label: "Ejemplo 3 (Complejo)", expr: "F = (A+B)*(A'+C) + B*C" },
    { label: "Ejemplo 4 (XOR)", expr: "Out = A ^ B ^ C" },
    { label: "Ejemplo NAND (Singular)", expr: "F = A + BC" }
  ];

  const handleKeyClick = (key) => {
    if (key === 'CLR') {
      setInput('');
      inputRef.current?.focus();
      return;
    }

    const currentInput = input;
    const start = inputRef.current?.selectionStart ?? currentInput.length;
    const end = inputRef.current?.selectionEnd ?? currentInput.length;

    if (key === 'DEL') {
      if (start === end && start > 0) {
        const newValue = currentInput.slice(0, start - 1) + currentInput.slice(end);
        setInput(newValue);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = start - 1;
            inputRef.current.focus();
          }
        }, 0);
      } else if (start !== end) {
        const newValue = currentInput.slice(0, start) + currentInput.slice(end);
        setInput(newValue);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = start;
            inputRef.current.focus();
          }
        }, 0);
      }
      return;
    }

    const charToInsert = key === 'SPACE' ? ' ' : key;
    const newValue = currentInput.slice(0, start) + charToInsert + currentInput.slice(end);
    setInput(newValue);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = start + charToInsert.length;
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleCalculate = () => {
    setError(null);
    setResults(null);
    setSelectedEvaluationIndex(-1); // Reset evaluación interactiva
    if (!input.trim()) {
      setError("Por favor ingresa una expresión booleana.");
      return;
    }

    try {
      // 1. Parsear
      const tokens = tokenize(input);
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // 2. Extraer variables
      let varsSet = getVariables(ast);
      let varNames = Array.from(varsSet).sort();
      
      if (varNames.length === 0) {
        throw new Error("No se detectaron variables válidas.");
      }
      
      let numVars = varNames.length;
      let isTooBig = numVars > 12;

      // 3. Generar Tabla de Verdad
      let numRows = Math.pow(2, Math.min(numVars, 12)); 
      let minterms = [];
      let maxterms = [];
      let table = [];
      
      let originalEvaluations = [];

      if (!isTooBig) {
        for (let i = 0; i < numRows; i++) {
          let env = {};
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
            if(sopStr === "0" || sopStr === "1") isValidated = true;
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

      setResults({
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
      });
      setAnnotatedAst(ast); // Ast base sin evaluar
      setActiveTab('truth');

    } catch (err) {
      setError(err.message || "Error al procesar la expresión.");
    }
  };

  // Efecto para actualizar el AST con los valores propagados al cambiar de fila
  useEffect(() => {
      if (results && results.table) {
          if (selectedEvaluationIndex >= 0 && selectedEvaluationIndex < results.table.length) {
              const env = results.table[selectedEvaluationIndex].env;
              const newAst = annotateAstWithValues(results.ast, env);
              setAnnotatedAst(newAst);
          } else {
              setAnnotatedAst(results.ast); // Reset a AST sin evaluar
          }
      }
  }, [selectedEvaluationIndex, results]);

  const tabs = [
    { id: 'truth', label: 'Tabla de Verdad' },
    { id: 'simp', label: 'Simplificación' },
    { id: 'canon', label: 'Formas Canónicas' },
    { id: 'gates', label: 'NAND / NOR' },
    { id: 'diagram', label: 'Diagrama Lógico' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">Calculadora Booleana</h1>
          </div>
          <button 
            onClick={() => setShowRules(!showRules)}
            className="flex items-center space-x-1 text-sm bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-full transition"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Leyes y Reglas</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 items-start">
        
        {/* SIDEBAR REGLAS (Condicional) */}
        {showRules && (
          <aside className="w-full lg:w-96 md:w-80 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-5 overflow-y-auto max-h-[80vh]">
            <h2 className="font-semibold text-lg border-b border-slate-100 pb-2 mb-4 flex items-center">
               <Info className="w-4 h-4 mr-2 text-indigo-500" /> Chuleta de Álgebra
            </h2>
            
            {/* NUEVA TABLA COMPARATIVA DE SÍMBOLOS */}
            <SymbolTable />

            <div className="space-y-4 text-sm text-slate-600">
              <RuleGroup title="Básicas" rules={[
                { n: "Identidad", e: "A+0=A, A*1=A" },
                { n: "Dominación", e: "A+1=1, A*0=0" },
                { n: "Idempotencia", e: "A+A=A, A*A=A" },
                { n: "Complemento", e: "A+A'=1, A*A'=0" },
                { n: "Doble negación", e: "(A')'=A" }
              ]} />
              <RuleGroup title="Propiedades" rules={[
                { n: "Conmutativa", e: "A+B = B+A" },
                { n: "Asociativa", e: "A+(B+C) = (A+B)+C" },
                { n: "Distributiva", e: "A*(B+C) = AB+AC" }
              ]} />
              <RuleGroup title="Teoremas avanzados" rules={[
                { n: "Absorción", e: "A+A*B = A\nA*(A+B) = A" },
                { n: "De Morgan", e: "(A+B)' = A'*B'\n(A*B)' = A'+B'" },
                { n: "Reducción", e: "A*B + A*B' = A\n(A+B)*(A+B') = A" },
                { n: "Consenso", e: "A*B + A'*C + B*C = A*B + A'*C" }
              ]} />
            </div>
            <div className="mt-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
              <strong>Sintaxis soportada:</strong><br/>
              AND: <code>*</code>, <code>·</code>, <code>AND</code><br/>
              OR: <code>+</code>, <code>OR</code><br/>
              NOT: <code>'</code> (postfijo), <code>!</code> (prefijo)<br/>
              XOR: <code>^</code>
            </div>
          </aside>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 w-full space-y-6">
          
          {/* CAJA DE ENTRADA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expresión Booleana
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                placeholder="Ej. A * (B + C') ^ D"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg transition-shadow"
              />
              <button
                onClick={handleCalculate}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Calcular
              </button>
            </div>

            {/* TECLADO EN PANTALLA */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
              <div className="flex flex-col gap-3">
                {/* Variables */}
                <div className="flex flex-wrap justify-center gap-2">
                  {['A', 'B', 'C', 'D', 'P', 'Q', 'R', 'S', 'X', 'Y', 'Z'].map(v => (
                    <button key={v} onClick={() => handleKeyClick(v)} className="w-10 h-10 rounded-lg bg-white border border-slate-300 shadow-sm text-slate-700 font-bold font-mono hover:bg-slate-100 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95">
                      {v}
                    </button>
                  ))}
                </div>
                {/* Operadores */}
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { k: '(', l: '(' }, { k: ')', l: ')' },
                    { k: '=', l: '=' },
                    { k: '+', l: '+ OR' }, { k: '*', l: '* AND' },
                    { k: "'", l: "' NOT" }, { k: '^', l: '^ XOR' }
                  ].map(op => (
                    <button key={op.k} onClick={() => handleKeyClick(op.k)} className="px-3 h-10 rounded-lg bg-indigo-50 border border-indigo-200 shadow-sm text-indigo-700 font-bold font-mono hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95">
                      {op.l}
                    </button>
                  ))}
                </div>
                {/* Acciones */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={() => handleKeyClick('CLR')} className="px-4 h-10 rounded-lg bg-red-50 border border-red-200 shadow-sm text-red-600 font-bold hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95">
                    CLR
                  </button>
                  <button onClick={() => handleKeyClick('SPACE')} className="w-32 h-10 rounded-lg bg-white border border-slate-300 shadow-sm text-slate-500 font-bold hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95">
                    Espacio
                  </button>
                  <button onClick={() => handleKeyClick('DEL')} className="px-4 h-10 rounded-lg bg-slate-200 border border-slate-300 shadow-sm text-slate-700 font-bold hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 active:scale-95">
                    DEL
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 text-red-600 flex items-center text-sm bg-red-50 p-2 rounded-md">
                <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 uppercase font-semibold">Ejemplos:</span>
              {ejemplos.map((ej, idx) => (
                <button
                  key={idx}
                  onClick={() => { setInput(ej.expr); setError(null); }}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors border border-slate-200"
                >
                  {ej.label}
                </button>
              ))}
            </div>
          </div>

          {/* ÁREA DE RESULTADOS */}
          {results && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* TABS HEADER */}
              <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 hide-scrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id 
                        ? 'border-indigo-600 text-indigo-700 bg-white' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TABS CONTENT */}
              <div className="p-6">
                
                {/* VISTA: TABLA DE VERDAD */}
                {activeTab === 'truth' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-medium">
                        Variables ({results.variables.length}): {results.variables.join(', ')}
                      </span>
                      {results.isTooBig && (
                        <span className="text-amber-600 flex items-center bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                           <AlertTriangle className="w-4 h-4 mr-1" /> Omitiendo tabla completa por rendimiento ({">"}12 vars).
                        </span>
                      )}
                    </div>
                    
                    {!results.isTooBig && (
                      <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-slate-200 text-sm text-center">
                          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-slate-600 w-16">Índice</th>
                              {results.variables.map(v => (
                                <th key={v} className="px-4 py-3 font-semibold text-indigo-900 border-l border-slate-200 bg-indigo-50/50">{v}</th>
                              ))}
                              <th className="px-4 py-3 font-bold text-slate-800 border-l border-slate-200 w-24">Salida (F)</th>
                              <th className="px-4 py-3 font-semibold text-slate-500 border-l border-slate-200">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {results.table.map((row, idx) => (
                              <tr key={idx} className={`${row.result === 1 ? 'bg-green-50/30' : 'hover:bg-slate-50'} ${selectedEvaluationIndex === idx ? 'ring-2 ring-indigo-400 inset-0 relative z-0 bg-indigo-50' : ''}`}>
                                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{idx}</td>
                                {results.variables.map(v => (
                                  <td key={v} className="px-4 py-2 text-slate-600 font-mono border-l border-slate-100">
                                    {row.env[v]}
                                  </td>
                                ))}
                                <td className={`px-4 py-2 font-bold font-mono border-l border-slate-100 ${row.result === 1 ? 'text-green-600' : 'text-slate-400'}`}>
                                  {row.result}
                                </td>
                                <td className="px-4 py-2 border-l border-slate-100">
                                  <button 
                                      onClick={() => {
                                          setSelectedEvaluationIndex(idx);
                                          setActiveTab('diagram');
                                      }}
                                      className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded transition-colors"
                                  >
                                      Evaluar en Circuito
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* VISTA: SIMPLIFICACIÓN */}
                {activeTab === 'simp' && (
                  <div className="space-y-6">
                    {results.isExact ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <ResultCard 
                          title="Suma de Productos Mínima (SOP)" 
                          badge="Quine-McCluskey"
                          content={results.sop} 
                        />
                        <ResultCard 
                          title="Producto de Sumas Mínimo (POS)" 
                          badge="Quine-McCluskey"
                          content={results.pos} 
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                        La simplificación exacta no está disponible para más de 12 variables.
                      </div>
                    )}
                    
                    {results.isValidated && (
                       <div className="flex items-center text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                         <Check className="w-5 h-5 mr-2" />
                         <strong>Validación Interna:</strong> La expresión simplificada es matemáticamente idéntica a la original para todas las combinaciones posibles.
                       </div>
                    )}
                  </div>
                )}

                {/* VISTA: FORMAS CANÓNICAS */}
                {activeTab === 'canon' && (
                  <div className="space-y-6">
                    <ResultCard 
                      title="Minterms Σm" 
                      subtitle="Suma Canónica de Productos"
                      content={results.canSOP} 
                      mono
                    />
                    <ResultCard 
                      title="Maxterms ΠM" 
                      subtitle="Producto Canónico de Sumas"
                      content={results.canPOS} 
                      mono
                    />
                  </div>
                )}

                {/* VISTA: NAND / NOR */}
                {activeTab === 'gates' && (
                  <div className="space-y-6">
                     <p className="text-sm text-slate-500 mb-2">Representación algebraica usando un solo tipo de compuerta universal (derivado de las formas simplificadas).</p>
                     <ResultCard 
                      title="Solo NAND" 
                      content={results.nandOnly} 
                      mono
                    />
                    <ResultCard 
                      title="Solo NOR" 
                      content={results.norOnly} 
                      mono
                    />
                  </div>
                )}

                {/* VISTA: DIAGRAMA */}
                {activeTab === 'diagram' && (
                  <div className="space-y-6">
                    
                    {/* Controles de Evaluación de Señal */}
                    {!results.isTooBig && (
                        <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                            <div className="text-sm text-slate-700">
                                <strong>Evaluación de propagación:</strong>{' '}
                                {selectedEvaluationIndex >= 0 ? (
                                    <span className="text-indigo-600 font-mono">
                                        Fila {selectedEvaluationIndex} (Salida: {results.table[selectedEvaluationIndex].result})
                                    </span>
                                ) : (
                                    <span className="text-slate-500 italic">Ninguna (Circuito estático)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <select 
                                    className="text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                    value={selectedEvaluationIndex}
                                    onChange={(e) => setSelectedEvaluationIndex(Number(e.target.value))}
                                >
                                    <option value="-1">-- Seleccionar combinación --</option>
                                    {results.table.map((row, idx) => (
                                        <option key={idx} value={idx}>
                                            Fila {idx}: {results.variables.map(v => `${v}=${row.env[v]}`).join(', ')}
                                        </option>
                                    ))}
                                </select>
                                {selectedEvaluationIndex >= 0 && (
                                    <button 
                                        onClick={() => setSelectedEvaluationIndex(-1)}
                                        className="text-xs px-2 py-1 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700">Circuito Lógico (Visual)</h3>
                            <p className="text-xs text-slate-500">Esquema generado automáticamente. {selectedEvaluationIndex >= 0 && "Mostrando flujo de señales lógicas."}</p>
                          </div>
                      </div>
                      
                      {/* Pasamos el AST anotado si hay evaluación en curso */}
                      <SvgLogicCircuit ast={annotatedAst || results.ast} />
                      
                      {selectedEvaluationIndex >= 0 && (
                          <div className="flex gap-4 mt-2 text-xs">
                              <span className="flex items-center"><span className="w-3 h-3 bg-green-100 border border-green-500 rounded-full inline-block mr-1"></span> Valor 1 Lógico</span>
                              <span className="flex items-center"><span className="w-3 h-3 bg-red-100 border border-red-500 rounded-full inline-block mr-1"></span> Valor 0 Lógico</span>
                          </div>
                      )}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-slate-700">Árbol Lógico (ASCII)</h3>
                          <CopyButton text={generateAsciiTree(annotatedAst || results.ast)} />
                        </div>
                        <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto border border-slate-700 shadow-inner">
                          {generateAsciiTree(annotatedAst || results.ast)}
                        </pre>
                      </div>
                      
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-slate-700">Código Graphviz DOT</h3>
                          <CopyButton text={generateDotGraph(annotatedAst || results.ast)} />
                        </div>
                        <p className="text-xs text-slate-500 mb-1">Copia este texto y pégalo en visores como <a href="https://dreampuf.github.io/GraphvizOnline/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Graphviz Online</a>.</p>
                        <pre className="p-4 bg-slate-50 text-slate-800 font-mono text-xs rounded-lg overflow-x-auto border border-slate-200">
                          {generateDotGraph(annotatedAst || results.ast)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}

// Subcomponentes UI

const SymbolTable = () => (
  <div className="mb-6">
    <h4 className="font-semibold text-slate-800 mb-2">Tabla Comparativa de Símbolos</h4>
    <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-2 py-1.5 border-b border-slate-200 font-semibold whitespace-nowrap">Aritmético</th>
            <th className="px-2 py-1.5 border-b border-slate-200 font-semibold">Lógico</th>
            <th className="px-2 py-1.5 border-b border-slate-200 font-semibold">Booleano</th>
            <th className="px-2 py-1.5 border-b border-slate-200 font-semibold">Resultado Clave</th>
          </tr>
        </thead>
        <tbody className="text-slate-600 bg-white divide-y divide-slate-100">
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">× o ·</td>
            <td className="px-2 py-1.5">AND <span className="text-[10px] text-slate-400 block">(Conjunción)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A · B <br/>o A ∧ B</td>
            <td className="px-2 py-1.5">1 · 1 = 1 <span className="text-[10px] text-slate-400 block">(Solo si ambos son 1)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">+</td>
            <td className="px-2 py-1.5">OR <span className="text-[10px] text-slate-400 block">(Disyunción)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A + B <br/>o A ∨ B</td>
            <td className="px-2 py-1.5">1 + 0 = 1 <span className="text-[10px] text-slate-400 block">(Si hay al menos un 1)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">-</td>
            <td className="px-2 py-1.5">NOT <span className="text-[10px] text-slate-400 block">(Negación)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">Ā o ¬A</td>
            <td className="px-2 py-1.5">Invierten el valor <span className="text-[10px] text-slate-400 block">(1 → 0)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">/</td>
            <td className="px-2 py-1.5 text-slate-400">No existe</td>
            <td className="px-2 py-1.5 font-mono text-slate-400">N/A</td>
            <td className="px-2 py-1.5 text-slate-400">No se pueden dividir valores lógicos</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">⊕</td>
            <td className="px-2 py-1.5">XOR <span className="text-[10px] text-slate-400 block">(O Exclusivo)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A ⊕ B</td>
            <td className="px-2 py-1.5">1 ⊕ 1 = 0 <span className="text-[10px] text-slate-400 block">(Solo si son diferentes)</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ResultCard = ({ title, subtitle, badge, content, mono = false }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center space-x-3">
        {badge && <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{badge}</span>}
        <CopyButton text={content} />
      </div>
    </div>
    <div className={`p-5 flex-1 break-all ${mono ? 'font-mono text-sm' : 'font-semibold text-lg'} text-slate-700 bg-white`}>
      {content}
    </div>
  </div>
);

const RuleGroup = ({ title, rules }) => (
  <div>
    <h4 className="font-semibold text-slate-800 mb-1">{title}</h4>
    <ul className="space-y-1.5 border-l-2 border-slate-200 pl-3">
      {rules.map((r, i) => (
        <li key={i}>
          <span className="text-xs text-slate-500 block">{r.n}</span>
          <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded block mt-0.5 whitespace-pre-wrap">{r.e}</code>
        </li>
      ))}
    </ul>
  </div>
);