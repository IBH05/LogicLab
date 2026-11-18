import { useEffect, useState } from 'react';
import { Calculator, CircuitBoard, GraduationCap, House } from 'lucide-react';
import App from './App';
import { CircuitEditor } from './components/CircuitEditor';
import { ExercisesView } from './components/ExercisesView';
import { Home } from './components/Home';
import { SiteFooter, SiteHeader, type NavItem } from './components/SiteChrome';
import { PageContainer, PageHeader } from './components/ui';
import { circuitFromExpressions, type Circuit } from './logic/circuit';

type View = 'home' | 'calc' | 'editor' | 'exercises';
const ROUTES: Record<string, View> = { '': 'home', '/': 'home', '/calculadora': 'calc', '/editor': 'editor', '/ejercicios': 'exercises' };
const NAV: (NavItem & { id: View })[] = [
  { id: 'home', label: 'Inicio', href: '#/', icon: House },
  { id: 'calc', label: 'Calculadora', href: '#/calculadora', icon: Calculator },
  { id: 'editor', label: 'Editor de circuitos', href: '#/editor', icon: CircuitBoard },
  { id: 'exercises', label: 'Ejercicios', href: '#/ejercicios', icon: GraduationCap },
];
const hrefOf = (v: View) => NAV.find(n => n.id === v)!.href;
const fromHash = (): View => ROUTES[window.location.hash.replace(/^#/, '')] ?? 'home';

/** Raíz de la aplicación: cabecera y pie globales y las cuatro vistas. */
export default function Shell() {
  const [view, setView] = useState<View>(fromHash);
  // Las vistas ya visitadas siguen montadas (ocultas): así el editor no pierde el circuito ni el historial.
  const [visited, setVisited] = useState<Set<View>>(() => new Set([fromHash()]));
  const [seed, setSeed] = useState<Circuit | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  const show = (v: View) => { setView(v); setVisited(s => new Set(s).add(v)); window.scrollTo?.(0, 0); };
  const go = (v: View) => { window.location.hash = hrefOf(v); show(v); };
  // Enlaces directos y botones atrás/adelante del navegador.
  useEffect(() => {
    const onHash = () => show(fromHash());
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
    <div className="min-h-screen flex flex-col bg-canvas text-ink-soft font-sans">
      <SiteHeader items={NAV} current={view} onNavigate={id => go(id as View)} />

      <div className="flex-1">
        {visited.has('home') && <div hidden={view !== 'home'}><Home /></div>}
        {visited.has('calc') && <div hidden={view !== 'calc'}><App onOpenInEditor={openInEditor} /></div>}

        {visited.has('editor') && (
          <div hidden={view !== 'editor'}>
            <main>
              <PageContainer wide className="py-6 space-y-4">
                <PageHeader title="Editor de circuitos lógicos" description="Arrastra compuertas, conéctalas, enciende las entradas y observa la tabla de verdad, la expresión, los caminos y el costo en vivo." />
                <CircuitEditor key={editorKey} initial={seed} />
              </PageContainer>
            </main>
          </div>
        )}

        {visited.has('exercises') && (
          <div hidden={view !== 'exercises'}>
            <main>
              <PageContainer className="py-6 space-y-4">
                <PageHeader title="Ejercicios" description="Problemas de electrónica digital con verificación automática por equivalencia lógica." />
                <ExercisesView />
              </PageContainer>
            </main>
          </div>
        )}
      </div>

      <SiteFooter items={NAV} />
    </div>
  );
}
