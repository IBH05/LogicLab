import { useMemo, useState } from 'react';
import { Calculator, Check, CircuitBoard, GraduationCap } from 'lucide-react';
import { EXERCISES } from '../logic/exercises';
import { analyzeOutput, circuitCost, circuitFromExpressions, toUniversal } from '../logic/circuit';
import { Accordion, Badge, Card, CardLink, LinkButton, Section } from './ui';

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

const MODULES = [
  { href: '#/calculadora', icon: Calculator, title: 'Calculadora booleana', img: 'calculadora', alt: '',
    text: 'Escribe una expresión y obtén su tabla de verdad, la simplificación paso a paso, las formas canónicas, NAND/NOR y el mapa de Karnaugh.' },
  { href: '#/editor', icon: CircuitBoard, title: 'Editor de circuitos', img: 'editor', alt: '',
    text: 'Arrastra compuertas, cablea y enciende interruptores. Mira la tabla, los caminos y el costo en chips mientras construyes.' },
  { href: '#/ejercicios', icon: GraduationCap, title: 'Ejercicios', img: 'ejercicios', alt: '',
    text: `${EXERCISES.length} problemas de electrónica digital con verificación automática, pistas y un generador aleatorio.` },
];

const PATH = [
  { n: 1, title: 'Explora', text: 'Juega con la compuerta de arriba y entiende cómo cambia la salida.' },
  { n: 2, title: 'Calcula', text: 'Pasa una expresión por la calculadora y revisa cada paso de su simplificación.' },
  { n: 3, title: 'Construye', text: 'Dibuja el circuito, conviértelo a solo NAND y compara cuántos chips necesitas.' },
  { n: 4, title: 'Practica', text: 'Resuelve problemas reales y recibe retroalimentación inmediata.' },
];

const ALARM = "Z = B + T'*S*(P+M)";

/** Cifras del caso de la alarma, calculadas con el mismo motor que usa la aplicación. */
function useAlarm() {
  return useMemo(() => {
    const base = circuitFromExpressions(ALARM);
    const out = base.nodes.find(n => n.type === 'OUTPUT')!.id;
    const a = analyzeOutput(base, out)!;
    return { rows: a.rows.length, ones: a.minterms.length, sop: a.sop, andOr: circuitCost(base), nand: circuitCost(toUniversal(base, 'NAND')) };
  }, []);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function AlarmCase() {
  const alarm = useAlarm();
  const [view, setView] = useState<'andor' | 'nand'>('andor');
  const cost = view === 'andor' ? alarm.andOr : alarm.nand;
  const steps = [
    { title: 'El enunciado', body: <p>La alarma de un laboratorio suena si hay puerta abierta o movimiento con el sistema armado, o si se pulsa el botón de pánico. Con el interruptor de mantenimiento activo, solo suena con el pánico.</p> },
    { title: 'La expresión', body: <p><code className="font-mono bg-slate-100 rounded px-1.5 py-0.5 break-words">{ALARM}</code></p> },
    { title: 'La tabla de verdad', body: <p>{alarm.rows} filas, {alarm.ones} con salida 1. Simplificada: <code className="font-mono bg-slate-100 rounded px-1.5 py-0.5 break-words">Z = {alarm.sop}</code></p> },
    { title: 'El circuito', body: <p>Se dibuja solo desde la expresión o lo armas tú con el ratón. Cada cable cambia de color según lleve un 0 o un 1.</p> },
    { title: 'Solo NAND', body: <p>Si el laboratorio solo tiene un chip 7400, el editor reconstruye el circuito con NAND y compara el costo.</p> },
  ];
  return (
    <Card className="grid lg:grid-cols-2 gap-6" padded>
      <ol className="space-y-4 list-none p-0 m-0">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0"><h3 className="font-semibold text-ink">{st.title}</h3><div className="text-sm text-ink-soft mt-0.5">{st.body}</div></div>
          </li>
        ))}
      </ol>
      <div className="min-w-0">
        <div role="group" aria-label="Versión del circuito" className="flex gap-2 mb-3">
          <button aria-pressed={view === 'andor'} onClick={() => setView('andor')} className={`px-3 py-1.5 rounded-control border text-sm font-semibold ${view === 'andor' ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface border-slate-300 hover:bg-slate-50'}`}>Con AND, OR y NOT</button>
          <button aria-pressed={view === 'nand'} onClick={() => setView('nand')} className={`px-3 py-1.5 rounded-control border text-sm font-semibold ${view === 'nand' ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface border-slate-300 hover:bg-slate-50'}`}>Solo NAND</button>
        </div>
        <img key={view} src={`/capturas/${view === 'andor' ? 'alarma-circuito' : 'alarma-nand'}.jpg`} width={798} height={322} loading="lazy"
          alt={view === 'andor' ? 'Circuito de la alarma con compuertas OR, AND y NOT; la salida Z se enciende cuando hay pánico.' : 'El mismo circuito de la alarma construido solo con compuertas NAND.'}
          className="w-full h-auto rounded-control border border-line bg-canvas" />
        <p aria-live="polite" className="mt-3 text-sm text-ink-soft">
          <strong className="text-ink">{plural(cost.gates, 'compuerta', 'compuertas')}</strong> · {plural(cost.gateInputs, 'entrada', 'entradas')} de compuerta · {plural(cost.chips, 'circuito integrado', 'circuitos integrados')} estimados
        </p>
      </div>
    </Card>
  );
}

const FAQ = [
  { id: 'cuenta', question: '¿Necesito crear una cuenta?', answer: <p>No. Todo se calcula en tu navegador y no hay registro ni servidor de aplicación.</p> },
  { id: 'progreso', question: '¿Dónde se guarda mi progreso?', answer: <p>En este navegador (<code>localStorage</code>): los ejercicios resueltos y el último circuito del editor. Si borras los datos del sitio o cambias de equipo, empiezas de cero. Puedes guardar un circuito aparte exportándolo a JSON.</p> },
  { id: 'limite', question: '¿Cuántas variables admite?', answer: <><p>La calculadora genera tabla y simplificación hasta 12 variables, aunque con funciones complejas puede tardar. El editor simplifica hasta 10 entradas, y el mapa de Karnaugh se muestra de 1 a 5 variables.</p></> },
  { id: 'minimo', question: '¿La simplificación siempre da la expresión mínima?', answer: <p>No está garantizado. Se usa Quine-McCluskey con una cobertura voraz, que puede no encontrar el mínimo global. Siempre se comprueba que el resultado sea equivalente a la expresión original.</p> },
  { id: 'movil', question: '¿Funciona en el celular?', answer: <p>La página se adapta a pantallas pequeñas, pero no se ha probado en dispositivos físicos. En pantallas táctiles el navegador no permite arrastrar desde la paleta: toca una compuerta para agregarla y luego arrástrala para moverla y cablearla.</p> },
  { id: 'exportar', question: '¿Puedo exportar mis circuitos?', answer: <p>Sí: a imagen SVG o PNG para un reporte, y a JSON para volver a abrirlos después.</p> },
];

export function Home() {
  return (
    <div className="text-ink-soft font-sans">
      <section aria-label="Presentación" className="bg-gradient-to-br from-brand-800 via-brand-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">Aprende lógica digital construyendo circuitos</h1>
            <p className="mt-4 text-lg text-brand-50">Escribe una expresión o arrastra compuertas, y mira al instante la tabla de verdad, la simplificación y el circuito.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="#/editor" variant="inverse" size="lg">Probar el editor</LinkButton>
              <LinkButton href="#/calculadora" variant="outline-inverse" size="lg">Usar la calculadora</LinkButton>
            </div>
            <ul aria-label="Características" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 list-none p-0 text-sm text-brand-50">
              {['Sin cuentas', 'Corre en tu navegador', 'Tu progreso queda en tu equipo'].map(t => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:justify-end"><Demo /></div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        <Section id="h-herr" title="Tres herramientas, un solo flujo" description="Empieza donde prefieras: lo que calculas se puede abrir en el editor, y lo que construyes se puede practicar en los ejercicios.">
          <ul className="grid md:grid-cols-3 gap-4 list-none p-0">
            {MODULES.map(({ href, icon: Icon, title, text, img, alt }) => (
              <li key={href}>
                <CardLink href={href} className="p-0! overflow-hidden flex flex-col">
                  <img src={`/capturas/${img}.jpg`} alt={alt} width={1280} height={720} loading="lazy" className="w-full h-auto border-b border-line bg-canvas" />
                  <span className="block p-5">
                    <Icon className="w-7 h-7 text-brand-600 mb-2" aria-hidden="true" />
                    <span className="block font-semibold text-lg text-ink">{title}</span>
                    <span className="block text-ink-soft mt-1 text-sm">{text}</span>
                    <span className="inline-block mt-3 text-brand-700 font-medium text-sm">Abrir →</span>
                  </span>
                </CardLink>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="h-caso" title="De un enunciado a un circuito" description="Un problema real, resuelto en cinco pasos con las mismas herramientas de esta página.">
          <AlarmCase />
        </Section>

        <Section id="h-ruta" title="Cómo aprender con LogicLab">
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0">
            {PATH.map(p => (
              <li key={p.n}>
                <Card className="h-full">
                  <span className="inline-flex w-8 h-8 rounded-full bg-brand-600 text-white font-bold items-center justify-center mb-2" aria-hidden="true">{p.n}</span>
                  <h3 className="font-semibold text-ink">{p.title}</h3>
                  <p className="text-sm text-ink-soft mt-1">{p.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Section>

        <section aria-labelledby="h-para" className="grid md:grid-cols-2 gap-6">
          <Card>
            <h2 id="h-para" className="text-xl font-bold text-ink mb-3">Para quién es</h2>
            <p className="text-sm">Estudiantes de sistemas digitales, electrónica, arquitectura de computadoras, programación y matemáticas discretas, y docentes que quieren una herramienta visual para clase.</p>
          </Card>
          <Card>
            <h2 className="text-xl font-bold text-ink mb-3">Qué incluye</h2>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>Operadores AND, OR, XOR y NOT, con teclado virtual</li>
              <li>Simplificación, SOP/POS y mapas de Karnaugh</li>
              <li>Conversión a solo NAND o solo NOR</li>
              <li>Caminos, retardo y costo en chips 74xx</li>
              <li>Exportar a SVG, PNG y JSON</li>
            </ul>
          </Card>
        </section>

        <Section id="h-faq" title="Preguntas frecuentes">
          <Accordion items={FAQ} />
        </Section>

        <section aria-labelledby="h-cta" className="rounded-card bg-gradient-to-br from-brand-800 to-brand-600 text-white p-8 text-center">
          <h2 id="h-cta" className="text-2xl font-bold">Empieza en un minuto</h2>
          <p className="mt-2 text-brand-50 max-w-xl mx-auto">El editor incluye un tutorial guiado (se abre solo la primera vez y después con el botón «Tutorial») que te lleva paso a paso a construir tu primera compuerta.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <LinkButton href="#/editor" variant="inverse" size="lg">Ir al editor</LinkButton>
            <LinkButton href="#/ejercicios" variant="outline-inverse" size="lg">Ver los ejercicios <Badge tone="neutral">{EXERCISES.length}</Badge></LinkButton>
          </div>
        </section>
      </main>
    </div>
  );
}
