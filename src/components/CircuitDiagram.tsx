import { useMemo } from 'react';
import type { Bit } from '../logic/boolean';
import { isGate, pinCount, simulate, type CNode, type Circuit, type GateType } from '../logic/circuit';

/* Geometría y símbolos compartidos por el editor y los diagramas de solo lectura. */

export const GATE_W = 80;
export const IO_W = 64;
export const size = (n: CNode) => (n.type === 'INPUT' || n.type === 'OUTPUT' ? { w: IO_W, h: 40 } : { w: GATE_W, h: n.type === 'NOT' ? 40 : Math.max(40, pinCount(n) * 20) });
export const inPin = (n: CNode, i: number) => ({ x: n.x, y: n.y + (n.type === 'OUTPUT' ? 20 : (size(n).h * (i + 0.5)) / pinCount(n)) });
export const outPin = (n: CNode) => ({ x: n.x + size(n).w, y: n.y + size(n).h / 2 });

export const bodyPath = (type: GateType, h: number) => {
  switch (type) {
    case 'AND': case 'NAND': return `M0 0 H35 A35 ${h / 2} 0 0 1 35 ${h} H0 Z`;
    case 'OR': case 'NOR': case 'XOR': case 'XNOR':
      return `M0 0 C25 0 55 ${h * 0.1} 70 ${h / 2} C55 ${h * 0.9} 25 ${h} 0 ${h} C${h * 0.35} ${h * 0.75} ${h * 0.35} ${h * 0.25} 0 0 Z`;
    case 'NOT': return `M0 0 L58 ${h / 2} L0 ${h} Z`;
    default: return '';
  }
};

/** Verde = 1, gris = 0, gris claro = sin valor. */
export const ioColor = (v: Bit | null | undefined) => (v === 1 ? '#16a34a' : v === 0 ? '#64748b' : '#94a3b8');

export const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.max(30, Math.abs(x2 - x1) / 2);
  return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
};

export function GateBody({ type, h, stroke, fill, sw }: { type: GateType; h: number; stroke: string; fill: string; sw: number }) {
  const bubble = type === 'NOT' || type === 'NAND' || type === 'NOR' || type === 'XNOR';
  const bx = type === 'NOT' ? 63 : 75;
  return (
    <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d={bodyPath(type, h)} />
      {(type === 'XOR' || type === 'XNOR') && <path d={`M-8 0 C${h * 0.35 - 8} ${h * 0.25} ${h * 0.35 - 8} ${h * 0.75} -8 ${h}`} fill="none" />}
      {bubble && <circle cx={bx} cy={h / 2} r="5" />}
    </g>
  );
}

type DiagramProps = {
  circuit: Circuit;
  inputValues: Record<string, Bit>;
  /** Si se da, las entradas son interruptores accesibles (clic, Espacio o Enter). */
  onToggleInput?: (id: string) => void;
  label: string;
  className?: string;
};

/** Diagrama de solo lectura de un circuito, con interruptores en las entradas y LED en las salidas. */
export function CircuitDiagram({ circuit, inputValues, onToggleInput, label, className = '' }: DiagramProps) {
  const values = useMemo(() => simulate(circuit, inputValues), [circuit, inputValues]);
  const byId = useMemo(() => new Map(circuit.nodes.map(n => [n.id, n])), [circuit]);
  const drivers = useMemo(() => new Map(circuit.wires.map(w => [`${w.to}:${w.pin}`, w.from])), [circuit]);
  const box = useMemo(() => {
    let w = 0; let h = 0;
    for (const n of circuit.nodes) { w = Math.max(w, n.x + size(n).w + 14); h = Math.max(h, n.y + size(n).h + 24); }
    return { w, h };
  }, [circuit]);

  return (
    <svg viewBox={`0 -14 ${box.w} ${box.h + 14}`} role="group" aria-label={label} className={className} style={{ userSelect: 'none' }}>
      {circuit.wires.map(w => {
        const a = byId.get(w.from); const b = byId.get(w.to);
        if (!a || !b) return null;
        const p1 = outPin(a); const p2 = inPin(b, w.pin);
        const v = values.get(w.from);
        return <path key={w.id} d={wirePath(p1.x, p1.y, p2.x, p2.y)} fill="none" stroke={ioColor(v)} strokeWidth={v === 1 ? 3.2 : 2.4} />;
      })}
      {circuit.nodes.map(n => {
        const { w, h } = size(n);
        const v = values.get(n.id);
        const on = n.type === 'INPUT' ? Boolean(inputValues[n.id]) : v === 1;
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            {n.type === 'INPUT' && (
              <g
                role={onToggleInput ? 'switch' : undefined} aria-checked={onToggleInput ? on : undefined} aria-label={`Entrada ${n.label}`}
                tabIndex={onToggleInput ? 0 : undefined} style={{ cursor: onToggleInput ? 'pointer' : 'default' }}
                onClick={() => onToggleInput?.(n.id)}
                onKeyDown={e => { if (onToggleInput && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onToggleInput(n.id); } }}
              >
                <rect width={w} height={h} rx="8" fill={on ? '#dcfce7' : '#fff'} stroke="#334155" strokeWidth="2" />
                <text x="14" y="26" fontSize="16" fontWeight="700" fill="#0f172a">{n.label}</text>
                <rect x="38" y="12" width="20" height="16" rx="8" fill={on ? '#16a34a' : '#94a3b8'} />
                <circle cx={on ? 52 : 44} cy="20" r="6" fill="#fff" />
                <circle cx={w} cy={20} r="5" fill="#fff" stroke="#334155" strokeWidth="2" />
              </g>
            )}
            {n.type === 'OUTPUT' && (
              <>
                <path d={`M0 20 H${w - 28}`} stroke={ioColor(drivers.has(`${n.id}:0`) ? values.get(drivers.get(`${n.id}:0`)!) : null)} strokeWidth="2.5" />
                <circle cx={w - 18} cy="20" r="16" fill={v === 1 ? '#fde047' : '#f1f5f9'} stroke="#334155" strokeWidth="2" />
                <text x={w - 18} y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{v ?? '?'}</text>
                <text x={w - 18} y="-6" textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{n.label}</text>
              </>
            )}
            {isGate(n.type) && (
              <>
                <GateBody type={n.type} h={h} stroke="#334155" fill={v === 1 ? '#dcfce7' : '#ffffff'} sw={2} />
                <path d={`M${['NOT', 'NAND', 'NOR', 'XNOR'].includes(n.type) ? w - 4 : 70} ${h / 2} H${w}`} stroke="#334155" strokeWidth="2" />
                <circle cx={w} cy={h / 2} r="5" fill="#fff" stroke="#334155" strokeWidth="2" />
                {Array.from({ length: pinCount(n) }, (_, i) => {
                  const p = inPin(n, i);
                  return <path key={i} d={`M0 ${p.y - n.y} H${n.type === 'NOT' ? 2 : ['OR', 'NOR', 'XOR', 'XNOR'].includes(n.type) ? 10 : 5}`} stroke="#334155" strokeWidth="2" />;
                })}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
