import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

/* Componentes base del sistema de diseño. Solo usan tokens de styles.css. */

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'outline-inverse';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border-transparent',
  secondary: 'bg-surface text-ink-soft border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-brand-700 border-transparent hover:bg-brand-50',
  inverse: 'bg-white text-brand-800 border-transparent hover:bg-brand-50',
  'outline-inverse': 'bg-transparent text-white border-white/80 hover:bg-white/10',
};
const SIZES: Record<Size, string> = { md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' };

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-control border-2 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

export function Button({ variant, size, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return <a className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ children, className = '', padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={`bg-surface border border-line rounded-card shadow-card ${padded ? 'p-5' : ''} ${className}`}>{children}</div>;
}

/** Tarjeta completa que es un enlace (un solo destino, un solo nombre accesible). */
export function CardLink({ children, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`block h-full bg-surface border border-line rounded-card shadow-card p-5 transition hover:border-brand-400 hover:shadow-raised ${className}`} {...props}>{children}</a>
  );
}

export function Badge({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'neutral' | 'success' }) {
  const tones = { brand: 'bg-brand-100 text-brand-800', neutral: 'bg-slate-100 text-ink-soft', success: 'bg-green-100 text-green-900' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Contenedor de página con ancho máximo y márgenes laterales uniformes. */
export function PageContainer({ children, wide = false, className = '' }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={`${wide ? 'max-w-[90rem]' : 'max-w-7xl'} mx-auto px-4 ${className}`}>{children}</div>;
}

/** Encabezado de página: el único h1 de cada vista, con descripción y acciones opcionales. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-ink-soft mt-1 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Sección con título enlazado por aria-labelledby. */
export function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-bold text-ink">{title}</h2>
      {description && <p className="text-ink-soft mt-1 mb-5 max-w-3xl">{description}</p>}
      <div className={description ? '' : 'mt-5'}>{children}</div>
    </section>
  );
}
