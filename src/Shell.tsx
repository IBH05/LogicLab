import { useEffect, useState } from 'react';
import { Calculator, CircuitBoard, GraduationCap, House } from 'lucide-react';
import App from './App';
import { CircuitEditor } from './components/CircuitEditor';
import { ExercisesView } from './components/ExercisesView';
import { Home } from './components/Home';
import { circuitFromExpressions, type Circuit } from './logic/circuit';

type View = 'home' | 'calc' | 'editor' | 'exercises';
const ROUTES: Record<string, View> = { '': 'home', '/': 'home', '/calculadora': 'calc', '/editor': 'editor', '/ejercicios': 'exercises' };
const PATHS: Record<View, string> = { home: '#/', calc: '#/calculadora', editor: '#/editor', exercises: '#/ejercicios' };
const fromHash = (): View => ROUTES[window.location.hash.replace(/^#/, '')] ?? 'home';
const VIEWS: { id: View; label: string; icon: typeof Calculator }[] = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'calc', label: 'Calculadora', icon: Calculator },
  { id: 'editor', label: 'Editor de circuitos', icon: CircuitBoard },
  { id: 'exercises', label: 'Ejercicios', icon: GraduationCap },
];

/** Raíz de la aplicación: navegación entre calculadora, editor de circuitos y ejercicios. */
export default function Shell() {
  const [view, setView] = useState<View>(fromHash);
  // Mantener montado el editor evita perder el circuito (y el historial) al cambiar de pestaña.
  const [visited, setVisited] = useState<Set<View>>(() => new Set([fromHash()]));
  const [seed, setSeed] = useState<Circuit | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  const go = (v: View) => { window.location.hash = PATHS[v]; setView(v); setVisited(s => new Set(s).add(v)); window.scrollTo?.(0, 0); };
  // Soporta enlaces directos y los botones atrás/adelante del navegador.
  useEffect(() => {
    const onHash = () => { const v = fromHash(); setView(v); setVisited(s => new Set(s).add(v)); window.scrollTo?.(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openInEditor = (expression: string) => {
    try {
      setSeed(circuitFromExpressions(expression));
      setEditorKey(k => k + 1);
      go('editor');
    } catch { /* la calculadora ya validó la expresión */ }
  };

  return (
    <>
      <nav aria-label="Secciones de LogicLab" className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
          <span className="font-bold tracking-tight mr-4 py-2 whitespace-nowrap">LogicLab</span>
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 ${view === id ? 'border-indigo-400 text-white' : 'border-transparent text-slate-300 hover:text-white'}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </nav>

      {visited.has('home') && <div hidden={view !== 'home'}><Home /></div>}
      {visited.has('calc') && <div hidden={view !== 'calc'}><App onOpenInEditor={openInEditor} /></div>}

      {visited.has('editor') && (
        <div hidden={view !== 'editor'} className="min-h-screen bg-slate-50 font-sans text-slate-800">
          <main className="max-w-[90rem] mx-auto px-4 py-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Editor de circuitos lógicos</h1>
              <p className="text-slate-700 text-sm">Arrastra compuertas, conéctalas, enciende las entradas y observa la tabla de verdad, la expresión, los caminos y el costo en vivo.</p>
            </div>
            <CircuitEditor key={editorKey} initial={seed} />
          </main>
        </div>
      )}

      {visited.has('exercises') && (
        <div hidden={view !== 'exercises'} className="min-h-screen bg-slate-50 font-sans text-slate-800">
          <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Ejercicios</h1>
              <p className="text-slate-700 text-sm">Problemas de electrónica digital con verificación automática por equivalencia lógica.</p>
            </div>
            <ExercisesView />
          </main>
        </div>
      )}
    </>
  );
}
