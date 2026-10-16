import { useState, useEffect, useMemo, useRef } from 'react';
import { Copy, Check, AlertTriangle, BookOpen, Calculator, Play, Info } from 'lucide-react';
import { calculateExpression, annotateAstWithValues, generateAsciiTree, generateDotGraph } from './logic/boolean';
import type { Ast, Bit, CalculationResult } from './logic/boolean';

// ==========================================
// 3.5 VISUALIZADOR DE CIRCUITOS (SVG)
// ==========================================

type Layout = { x: number; y: number; layer: number; slots: number; value?: Bit };
type VisualNode = Layout & (
  { type: 'VAR'; name: string } |
  { type: 'NOT'; child: VisualNode } |
  { type: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'; left: VisualNode; right: VisualNode }
);
type Wire = { x1: number; y1: number; x2: number; y2: number; val?: Bit };

const optimizeForVisualization = (node: Ast): VisualNode => {
  const layout = { x: 0, y: 0, layer: 0, slots: 0, value: node.value };
  if (node.type === 'VAR') return { ...layout, type: 'VAR', name: node.name };
  if (node.type === 'NOT') {
    const child = optimizeForVisualization(node.child);
    if (child.type === 'AND') return { ...layout, type: 'NAND', left: child.left, right: child.right };
    if (child.type === 'OR') return { ...layout, type: 'NOR', left: child.left, right: child.right };
    if (child.type === 'XOR') return { ...layout, type: 'XNOR', left: child.left, right: child.right };
    return { ...layout, type: 'NOT', child };
  }
  return { ...layout, type: node.type, left: optimizeForVisualization(node.left), right: optimizeForVisualization(node.right) };
};

const LogicGateNode = ({ node }: { node: VisualNode }) => {
    const { x, y, type, value } = node;
    const hasValue = value !== undefined;

    if (type === 'VAR') {
        return (
            <g transform={`translate(${x - 20}, ${y - 12})`}>
                <rect x="0" y="0" width="40" height="24" rx="12" fill={hasValue ? (value === 1 ? '#dcfce7' : '#fee2e2') : '#fef08a'} stroke={hasValue ? (value === 1 ? '#22c55e' : '#ef4444') : '#eab308'} strokeWidth="2" />
                <text x="20" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill={hasValue ? (value === 1 ? '#166534' : '#991b1b') : '#854d0e'}>{node.name}</text>

                {/* Visualización de valor de salida */}
                {hasValue && (
                     <text x="50" y="-2" textAnchor="middle" fontSize="10" fontWeight="bold" fill={value === 1 ? '#15803d' : '#b91c1c'}>{value}</text>
                )}
            </g>
        );
    }

    const gateEnds: Partial<Record<VisualNode['type'], number>> = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };
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
                <text x={endX + 15} y="10" textAnchor="middle" fontSize="10" fontWeight="bold" fill={value === 1 ? '#15803d' : '#b91c1c'}>{value}</text>
            )}
        </g>
    );
};

const SvgLogicCircuit = ({ ast }: { ast: Ast }) => {
  const visualAst = useMemo(() => optimizeForVisualization(ast), [ast]);

  const { nodes, lines, width, height } = useMemo(() => {
     if (!visualAst) return { nodes: [], lines: [], width: 0, height: 0 };

     const LAYER_WIDTH = 130;
     const SLOT_HEIGHT = 45;

     const computeLayer = (n: VisualNode): number => {
         if (n.type === 'VAR') return n.layer = 0;
         if (n.type === 'NOT') return n.layer = computeLayer(n.child) + 1;
         return n.layer = Math.max(computeLayer(n.left), computeLayer(n.right)) + 1;
     };
     const maxLayer = computeLayer(visualAst);

     const computeSlots = (n: VisualNode): number => {
         if (n.type === 'VAR') return n.slots = 1;
         if (n.type === 'NOT') return n.slots = computeSlots(n.child);
         return n.slots = computeSlots(n.left) + computeSlots(n.right);
     };
     const totalSlots = computeSlots(visualAst);

     const nodesList: VisualNode[] = [];
     const linesList: Wire[] = [];

     const build = (n: VisualNode, yMin: number, yMax: number) => {
         const y = (yMin + yMax) / 2;
         const x = 50 + n.layer * LAYER_WIDTH;
         n.x = x;
         n.y = y;
         nodesList.push(n);

         const gateEnds: Partial<Record<VisualNode['type'], number>> = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };

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

     const finalGateEnd: Partial<Record<VisualNode['type'], number>> = { AND: 33, NAND: 39, OR: 28, NOR: 34, XOR: 34, XNOR: 40, NOT: 31 };
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

  const drawLine = (l: Wire, i: number) => {
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
     <div tabIndex={0} role="region" aria-label="Circuito desplazable" className="overflow-auto bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-6 custom-scrollbar relative">
         <svg role="img" aria-label="Circuito lógico de la expresión; descripción equivalente disponible en el árbol ASCII" width={width} height={height} className="min-w-full">
             {lines.map((l, i) => drawLine(l, i))}
             {nodes.map((n, i) => <LogicGateNode key={i} node={n} />)}

             {/* Etiqueta final */}
             <text x={visualAst?.x + 75} y={visualAst?.y + 4} fontSize="12" fontWeight="bold" fill={visualAst?.value === 1 ? '#15803d' : (visualAst?.value === 0 ? '#b91c1c' : '#334155')}>Salida</text>
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

const copyToClipboard = (text: string, setCopied: (copied: boolean) => void) => {
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

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => copyToClipboard(text, setCopied)}
      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
      title="Copiar al portapapeles"
    >
      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
    </button>
  );
};

// COMPONENTE PRINCIPAL APP
export default function App() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('truth');
  const [showRules, setShowRules] = useState(false);

  // Nuevo estado para la evaluación en tiempo real del diagrama
  const [selectedEvaluationIndex, setSelectedEvaluationIndex] = useState(-1);
  const [annotatedAst, setAnnotatedAst] = useState<Ast | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const ejemplos = [
    { label: "Ejemplo 1 (SOP básico)", expr: "D = Pwr * (H + R) * B" },
    { label: "Ejemplo 2 (De Morgan)", expr: "Rpluma = (S * P)' + A * C'" },
    { label: "Ejemplo 3 (Complejo)", expr: "F = (A+B)*(A'+C) + B*C" },
    { label: "Ejemplo 4 (XOR)", expr: "Out = A ^ B ^ C" },
    { label: "Ejemplo NAND (Singular)", expr: "F = A + B*C" }
  ];

  const handleKeyClick = (key: string) => {
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
      const result = calculateExpression(input);
      setResults(result);
      const ast = result.ast;
      setAnnotatedAst(ast); // Ast base sin evaluar
      setActiveTab('truth');

    } catch (err) {
      setError((err instanceof Error ? err.message : '') || "Error al procesar la expresión.");
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
            <h1 className="text-xl font-bold tracking-tight">LogicLab · Calculadora Booleana</h1>
          </div>
          <button
            aria-label="Leyes y Reglas"
            aria-expanded={showRules}
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
        <div className="flex-1 min-w-0 w-full space-y-6">

          {/* CAJA DE ENTRADA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label htmlFor="expression" className="block text-sm font-medium text-slate-700 mb-2">
              Expresión Booleana
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="expression"
                aria-describedby="syntax-help"
                aria-invalid={Boolean(error)}
                maxLength={2000}
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                placeholder="Ej. A * (B + C') ^ D"
                className="flex-1 min-w-0 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg transition-shadow"
              />
              <button
                onClick={handleCalculate}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Calcular
              </button>
            </div>

            <p id="syntax-help" className="mt-2 text-sm text-slate-600">Usa * para AND, + para OR, ^ para XOR y ! o ' para NOT. BC es una variable; escribe B*C para multiplicar. Se admiten 0 y 1.</p>
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
                  <button onClick={() => handleKeyClick('CLR')} className="px-4 h-10 rounded-lg bg-red-50 border border-red-200 shadow-sm text-red-700 font-bold hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95">
                    CLR
                  </button>
                  <button onClick={() => handleKeyClick('SPACE')} className="w-32 h-10 rounded-lg bg-white border border-slate-300 shadow-sm text-slate-600 font-bold hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95">
                    Espacio
                  </button>
                  <button onClick={() => handleKeyClick('DEL')} className="px-4 h-10 rounded-lg bg-slate-200 border border-slate-300 shadow-sm text-slate-700 font-bold hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 active:scale-95">
                    DEL
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-3 text-red-700 flex items-center text-sm bg-red-50 p-2 rounded-md">
                <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-600 uppercase font-semibold">Ejemplos:</span>
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
                        : 'border-transparent text-slate-600 hover:text-slate-700 hover:bg-slate-100'
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
                              <th className="px-4 py-3 font-semibold text-slate-600 border-l border-slate-200">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {results.table.map((row, idx) => (
                              <tr key={idx} className={`${row.result === 1 ? 'bg-green-50/30' : 'hover:bg-slate-50'} ${selectedEvaluationIndex === idx ? 'ring-2 ring-indigo-400 inset-0 relative z-0 bg-indigo-50' : ''}`}>
                                <td className="px-4 py-2 text-slate-600 font-mono text-xs">{idx}</td>
                                {results.variables.map(v => (
                                  <td key={v} className="px-4 py-2 text-slate-600 font-mono border-l border-slate-100">
                                    {row.env[v]}
                                  </td>
                                ))}
                                <td className={`px-4 py-2 font-bold font-mono border-l border-slate-100 ${row.result === 1 ? 'text-green-700' : 'text-slate-600'}`}>
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
                          title="Suma de Productos Simplificada (SOP)"
                          badge="Quine-McCluskey"
                          content={results.sop}
                        />
                        <ResultCard
                          title="Producto de Sumas Simplificado (POS)"
                          badge="Quine-McCluskey"
                          content={results.pos}
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                        La simplificación exacta no está disponible para más de 12 variables.
                      </div>
                    )}

                    <p className="text-sm text-slate-600">La cobertura final usa una selección voraz; no garantiza el mínimo global. El procedimiento paso a paso y sus explicaciones todavía están pendientes.</p>
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
                     <p className="text-sm text-slate-600 mb-2">Representación algebraica usando un solo tipo de compuerta universal (derivado de las formas simplificadas).</p>
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
                                    <span className="text-slate-600 italic">Ninguna (Circuito estático)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    aria-label="Combinación para evaluar el circuito"
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
                                        className="text-xs px-2 py-1 text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded"
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
                            <p className="text-xs text-slate-600">Esquema generado automáticamente. {selectedEvaluationIndex >= 0 && "Mostrando flujo de señales lógicas."}</p>
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
                        <pre tabIndex={0} className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto border border-slate-700 shadow-inner">
                          {generateAsciiTree(annotatedAst || results.ast)}
                        </pre>
                      </div>

                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-slate-700">Código Graphviz DOT</h3>
                          <CopyButton text={generateDotGraph(annotatedAst || results.ast)} />
                        </div>
                        <p className="text-xs text-slate-600 mb-1">Copia este texto y pégalo en visores como <a href="https://dreampuf.github.io/GraphvizOnline/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Graphviz Online</a>.</p>
                        <pre tabIndex={0} className="p-4 bg-slate-50 text-slate-800 font-mono text-xs rounded-lg overflow-x-auto border border-slate-200">
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
            <td className="px-2 py-1.5">AND <span className="text-[10px] text-slate-600 block">(Conjunción)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A · B <br/>o A ∧ B</td>
            <td className="px-2 py-1.5">1 · 1 = 1 <span className="text-[10px] text-slate-600 block">(Solo si ambos son 1)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">+</td>
            <td className="px-2 py-1.5">OR <span className="text-[10px] text-slate-600 block">(Disyunción)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A + B <br/>o A ∨ B</td>
            <td className="px-2 py-1.5">1 + 0 = 1 <span className="text-[10px] text-slate-600 block">(Si hay al menos un 1)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">-</td>
            <td className="px-2 py-1.5">NOT <span className="text-[10px] text-slate-600 block">(Negación)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">Ā o ¬A</td>
            <td className="px-2 py-1.5">Invierten el valor <span className="text-[10px] text-slate-600 block">(1 → 0)</span></td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">/</td>
            <td className="px-2 py-1.5 text-slate-600">No existe</td>
            <td className="px-2 py-1.5 font-mono text-slate-600">N/A</td>
            <td className="px-2 py-1.5 text-slate-600">No se pueden dividir valores lógicos</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap text-center">⊕</td>
            <td className="px-2 py-1.5">XOR <span className="text-[10px] text-slate-600 block">(O Exclusivo)</span></td>
            <td className="px-2 py-1.5 font-mono whitespace-nowrap">A ⊕ B</td>
            <td className="px-2 py-1.5">1 ⊕ 1 = 0 <span className="text-[10px] text-slate-600 block">(Solo si son diferentes)</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ResultCard = ({ title, subtitle, badge, content, mono = false }: { title: string; subtitle?: string; badge?: string; content: string; mono?: boolean }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
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

const RuleGroup = ({ title, rules }: { title: string; rules: { n: string; e: string }[] }) => (
  <div>
    <h4 className="font-semibold text-slate-800 mb-1">{title}</h4>
    <ul className="space-y-1.5 border-l-2 border-slate-200 pl-3">
      {rules.map((r, i) => (
        <li key={i}>
          <span className="text-xs text-slate-600 block">{r.n}</span>
          <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded block mt-0.5 whitespace-pre-wrap">{r.e}</code>
        </li>
      ))}
    </ul>
  </div>
);
