import type { ComponentType } from 'react';

export type NavItem = { id: string; label: string; href: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }> };

/** Marca de LogicLab: una compuerta AND estilizada. */
function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-brand-600)" />
      <path d="M8 9 H16 A7 7 0 0 1 16 23 H8 Z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M3 13 H8 M3 19 H8 M23 16 H29" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Cabecera global: la única de la aplicación. */
export function SiteHeader({ items, current, onNavigate }: { items: NavItem[]; current: string; onNavigate: (id: string) => void }) {
  return (
    <header className="bg-chrome text-white sticky top-0 z-40">
      <nav aria-label="Secciones de LogicLab" className="max-w-[90rem] mx-auto px-4 flex items-center gap-1 overflow-x-auto">
        <a href="#/" aria-label="LogicLab, ir al inicio" className="flex items-center gap-2 mr-4 py-2 font-bold tracking-tight whitespace-nowrap">
          <LogoMark />LogicLab
        </a>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)} aria-current={current === id ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${current === id ? 'border-brand-400 text-white' : 'border-transparent text-slate-300 hover:text-white'}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
    </header>
  );
}

/** Pie global con los mismos destinos que la cabecera. */
export function SiteFooter({ items }: { items: NavItem[] }) {
  return (
    <footer className="border-t border-line bg-surface mt-10">
      <div className="max-w-[90rem] mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>LogicLab · Proyecto académico del Equipo 3</p>
        <ul aria-label="Enlaces del pie" className="flex flex-wrap gap-4 list-none p-0 m-0">
          {items.map(i => <li key={i.id}><a href={i.href} className="underline underline-offset-2 hover:text-ink">{i.label}</a></li>)}
        </ul>
      </div>
    </footer>
  );
}
