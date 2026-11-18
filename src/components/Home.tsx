import { useState } from 'react';
import { BookOpenCheck, Calculator, CircuitBoard, GraduationCap, Grid3x3, Share2 } from 'lucide-react';
import { EXERCISES } from '../logic/exercises';

type DemoGate = 'AND' | 'OR' | 'XOR' | 'NAND';
const apply = (g: DemoGate, a: 0 | 1, b: 0 | 1): 0 | 1 =>
  (g === 'AND' ? a & b : g === 'OR' ? a | b : g === 'XOR' ? a ^ b : (a & b) ^ 1) as 0 | 1;

function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on} aria-label={`Entrada ${label}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-mono font-bold ${on ? 'bg-green-100 border-green-600 text-green-900' : 'bg-white border-slate-400 text-slate-800'}`}>
      {label}<span aria-hidden="true" className={`w-9 h-5 rounded-full relative ${on ? 'bg-green-600' : 'bg-slate-400'}`}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[1.15rem]' : 'left-0.5'}`} /></span>{on ? 1 : 0}
    </button>
  );
}

/** Demostración interactiva: dos interruptores, una compuerta y su tabla de verdad. */
function Demo() {
  const [a, setA] = useState<0 | 1>(1);
  const [b, setB] = useState<0 | 1>(0);
  const [gate, setGate] = useState<DemoGate>('AND');
  const out = apply(gate, a, b);
  return (
    <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-xl w-full max-w-md" aria-label="Demostración interactiva de una compuerta">
      <div role="group" aria-label="Tipo de compuerta" className="flex gap-1 mb-4">
        {(['AND', 'OR', 'XOR', 'NAND'] as DemoGate[]).map(g => (
          <button key={g} aria-pressed={gate === g} onClick={() => setGate(g)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border ${gate === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>{g}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex flex-col gap-3"><Switch label="A" on={a === 1} onToggle={() => setA(a ? 0 : 1)} /><Switch label="B" on={b === 1} onToggle={() => setB(b ? 0 : 1)} /></div>
        <svg viewBox="0 0 160 100" className="w-32 h-20" role="img" aria-label={`Compuerta ${gate} con salida ${out}`}>
          <path d="M0 30 H40 M0 70 H40" stroke={a ? '#16a34a' : '#64748b'} strokeWidth="4" />
          <path d="M0 70 H40" stroke={b ? '#16a34a' : '#64748b'} strokeWidth="4" />
          <path d={gate === 'OR' || gate === 'XOR' ? 'M40 15 C70 15 100 25 115 50 C100 75 70 85 40 85 C52 65 52 35 40 15 Z' : 'M40 15 H75 A35 35 0 0 1 75 85 H40 Z'} fill={out ? '#dcfce7' : '#fff'} stroke="#334155" strokeWidth="3" />
          {gate === 'XOR' && <path d="M32 15 C44 35 44 65 32 85" fill="none" stroke="#334155" strokeWidth="3" />}
          {gate === 'NAND' && <circle cx="115" cy="50" r="5" fill="#fff" stroke="#334155" strokeWidth="3" />}
          <path d={`M${gate === 'NAND' ? 120 : 115} 50 H150`} stroke={out ? '#16a34a' : '#64748b'} strokeWidth="4" />
        </svg>
        <div aria-live="polite" className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${out ? 'bg-yellow-300 border-yellow-500' : 'bg-slate-100 border-slate-400'}`}>
          <span className="sr-only">Salida </span>{out}
        </div>
      </div>
      <table className="mt-4 w-full text-center text-sm font-mono border border-slate-200">
        <thead className="bg-slate-100"><tr><th scope="col">A</th><th scope="col">B</th><th scope="col">{gate}</th></tr></thead>
        <tbody>{([[0, 0], [0, 1], [1, 0], [1, 1]] as [0 | 1, 0 | 1][]).map(([x, y]) => (
          <tr key={`${x}${y}`} className={x === a && y === b ? 'bg-amber-200 font-bold' : ''}><td>{x}</td><td>{y}</td><td>{apply(gate, x, y)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const CARDS = [
  { href: '#/calculadora', icon: Calculator, title: 'Calculadora booleana', text: 'Escribe una expresión y obtén su tabla de verdad, simplificación paso a paso, formas canónicas, NAND/NOR y mapa de Karnaugh.' },
  { href: '#/editor', icon: CircuitBoard, title: 'Editor de circuitos', text: 'Arrastra compuertas, cablea y enciende interruptores. Mira la tabla, los caminos y el costo en chips mientras construyes.' },
  { href: '#/ejercicios', icon: GraduationCap, title: 'Ejercicios', text: `${EXERCISES.length} problemas de electrónica digital con verificación automática y pistas, más un generador aleatorio.` },
];

const STEPS = [
  { n: 1, title: 'Explora', text: 'Juega con la compuerta de arriba y entiende cómo cambia la salida.' },
  { n: 2, title: 'Calcula', text: 'Pasa una expresión por la calculadora y revisa cada paso de su simplificación.' },
  { n: 3, title: 'Construye', text: 'Dibuja el circuito, conviértelo a solo NAND y compara cuántos chips necesitas.' },
  { n: 4, title: 'Practica', text: 'Resuelve problemas reales, como una alarma o un medio sumador, y recibe retroalimentación inmediata.' },
];

export function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-3 py-1 mb-4"><BookOpenCheck className="w-4 h-4" aria-hidden="true" />Álgebra booleana interactiva</p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">Aprende lógica digital construyendo circuitos</h1>
            <p className="mt-4 text-lg text-indigo-50">Expresiones, tablas de verdad, simplificación y compuertas en un solo lugar. Todo corre en tu navegador, sin cuentas ni instalación.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#/editor" className="px-5 py-3 rounded-lg bg-white text-indigo-800 font-semibold hover:bg-indigo-50">Abrir el editor</a>
              <a href="#/calculadora" className="px-5 py-3 rounded-lg border-2 border-white/80 font-semibold hover:bg-white/10">Usar la calculadora</a>
            </div>
          </div>
          <div className="flex justify-center md:justify-end"><Demo /></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-14">
        <section aria-labelledby="h-herr">
          <h2 id="h-herr" className="text-2xl font-bold mb-5">Herramientas</h2>
          <ul className="grid md:grid-cols-3 gap-4 list-none p-0">
            {CARDS.map(({ href, icon: Icon, title, text }) => (
              <li key={href}>
                <a href={href} className="block h-full bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition">
                  <Icon className="w-8 h-8 text-indigo-600 mb-3" aria-hidden="true" />
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="text-slate-700 mt-1 text-sm">{text}</p>
                  <span className="inline-block mt-3 text-indigo-700 font-medium text-sm">Abrir →</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-ruta">
          <h2 id="h-ruta" className="text-2xl font-bold mb-5">Cómo aprender con LogicLab</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0">
            {STEPS.map(s => (
              <li key={s.n} className="bg-white border border-slate-200 rounded-xl p-5">
                <span className="inline-flex w-8 h-8 rounded-full bg-indigo-600 text-white font-bold items-center justify-center mb-2" aria-hidden="true">{s.n}</span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-slate-700 mt-1">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="h-inc" className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 id="h-inc" className="text-xl font-bold mb-3 flex items-center gap-2"><Grid3x3 className="w-5 h-5 text-indigo-600" aria-hidden="true" />Qué incluye</h2>
            <ul className="text-sm text-slate-800 space-y-1 list-disc pl-5">
              <li>Operadores AND, OR, XOR y NOT, con teclado virtual</li>
              <li>Simplificación (Quine-McCluskey), SOP y POS</li>
              <li>Mapas de Karnaugh de 1 a 5 variables</li>
              <li>Conversión a circuitos solo NAND o solo NOR</li>
              <li>Caminos, retardo y costo en chips 74xx</li>
              <li>Exportar circuitos a SVG, PNG y JSON</li>
            </ul>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Share2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />Para quién es</h2>
            <p className="text-sm text-slate-800">Estudiantes de sistemas digitales, electrónica, arquitectura de computadoras, programación y matemáticas discretas, y docentes que quieren una herramienta visual para clase.</p>
            <p className="text-xs text-slate-600 mt-3">Tu progreso en los ejercicios se guarda solo en este navegador.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-600">LogicLab · Proyecto académico del Equipo 3</footer>
    </div>
  );
}
