import { useMemo, useState } from 'react';
import { Calculator, Check, CircuitBoard, GraduationCap } from 'lucide-react';
import { EXERCISES } from '../logic/exercises';
import type { Bit } from '../logic/boolean';
import { analyzeOutput, circuitCost, circuitFromExpressions, simulate, toUniversal } from '../logic/circuit';
import { CircuitDiagram } from './CircuitDiagram';
import { Accordion, Badge, Button, Card, CardLink, LinkButton, Section } from './ui';

type Preset = { id: string; label: string; expr: string; caption: string };
const PRESETS: Preset[] = [
  { id: 'sumador', label: 'Medio sumador', expr: 'S = A^B; C = A*B', caption: 'Suma dos bits: S es la suma y C el acarreo.' },
  { id: 'mayoria', label: 'Mayoría de 3', expr: 'M = A*B + A*C + B*C', caption: 'M vale 1 cuando al menos dos entradas valen 1.' },
];

/** Demostración con un circuito real: el mismo modelo y simulador que usa el editor. */
function CircuitDemo({ onOpenInEditor }: { onOpenInEditor?: (expr: string) => void }) {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find(p => p.id === presetId)!;
  const circuit = useMemo(() => circuitFromExpressions(preset.expr), [preset]);
  const [on, setOn] = useState<Record<string, Bit>>({});
  const [lastPreset, setLastPreset] = useState(presetId);
  if (lastPreset !== presetId) { setLastPreset(presetId); setOn({}); }

  const inputs = useMemo(() => circuit.nodes.filter(n => n.type === 'INPUT').sort((a, b) => (a.label < b.label ? -1 : 1)), [circuit]);
  const outputs = useMemo(() => circuit.nodes.filter(n => n.type === 'OUTPUT').sort((a, b) => (a.label < b.label ? -1 : 1)), [circuit]);
  // Una tabla por salida (todas comparten las mismas entradas en estos ejemplos).
  const analyses = useMemo(() => outputs.map(o => analyzeOutput(circuit, o.id, { simplify: false })!), [circuit, outputs]);
  const values = useMemo(() => simulate(circuit, on), [circuit, on]);
  const activeRow = analyses[0].rows.findIndex(r => inputs.every(i => (on[i.id] ?? 0) === r.env[i.label]));
  const summary = `${inputs.map(i => `${i.label}=${on[i.id] ?? 0}`).join(', ')}: ${outputs.map(o => `${o.label}=${values.get(o.id) ?? '?'}`).join(', ')}`;

  return (
    <div className="bg-white text-ink rounded-2xl p-5 shadow-raised w-full max-w-xl" aria-label="Demostración con un circuito real">
      <div role="group" aria-label="Circuito de ejemplo" className="flex flex-wrap gap-1 mb-3">
        {PRESETS.map(p => (
          <button key={p.id} aria-pressed={presetId === p.id} onClick={() => setPresetId(p.id)}
            className={`px-3 py-1.5 rounded-control text-sm font-semibold border ${presetId === p.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>{p.label}</button>
        ))}
      </div>
      <p className="text-sm text-ink-soft mb-2">{preset.caption} <span className="text-muted">Haz clic en las entradas para encenderlas.</span></p>
      <CircuitDiagram circuit={circuit} inputValues={on} label={`Circuito: ${preset.label}`} className="w-full h-auto bg-canvas rounded-control border border-line"
        onToggleInput={id => setOn(v => ({ ...v, [id]: v[id] ? 0 : 1 }))} />
      <p aria-live="polite" className="sr-only">{summary}</p>
      <table className="mt-3 w-full text-center text-sm font-mono border border-line">
        <caption className="sr-only">Tabla de verdad de {preset.label}</caption>
        <thead className="bg-slate-100"><tr>
          {inputs.map(i => <th scope="col" key={i.id}>{i.label}</th>)}
          {outputs.map(o => <th scope="col" key={o.id} className="bg-brand-50 text-brand-800">{o.label}</th>)}
        </tr></thead>
        <tbody>{analyses[0].rows.map((row, ri) => (
          <tr key={ri} aria-current={ri === activeRow ? 'true' : undefined} className={ri === activeRow ? 'bg-amber-200 font-bold' : ''}>
            {inputs.map(i => <td key={i.id}>{row.env[i.label]}</td>)}
            {analyses.map((a, ai) => <td key={ai}>{a.rows[ri].result}</td>)}
          </tr>
        ))}</tbody>
      </table>
      {onOpenInEditor && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenInEditor(preset.expr)}>Abrir este circuito en el editor →</Button>
        </div>
      )}
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

export function Home({ onOpenInEditor }: { onOpenInEditor?: (expr: string) => void } = {}) {
  return (
    <div className="text-ink-soft font-sans">
      <section aria-label="Presentación" className="bg-gradient-to-br from-brand-800 via-brand-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">Aprende lógica digital construyendo circuitos</h1>
            <p className="mt-4 text-lg text-brand-50">Escribe una expresión o arrastra compuertas, y mira al instante la tabla de verdad, la simplificación y el circuito. Pruébalo aquí mismo.</p>
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
          <div className="flex justify-center md:justify-end"><CircuitDemo onOpenInEditor={onOpenInEditor} /></div>
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
