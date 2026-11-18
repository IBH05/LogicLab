/** Ruta de aprendizaje: unidades ordenadas por dificultad, cada una con sus ejercicios. */
export type Unit = {
  id: string;
  title: string;
  summary: string;
  /** Consejo con la herramienta de la aplicación que más ayuda en la unidad. */
  tip: { text: string; label: string; href: string };
  exercises: string[];
};

export const UNITS: Unit[] = [
  { id: 'compuertas', title: 'Compuertas y señales', summary: 'Cómo se comporta cada compuerta y qué hace un inversor.',
    tip: { text: 'Juega con la demostración del inicio antes de empezar.', label: 'Ir al inicio', href: '#/' },
    exercises: ['g-xor', 'g-nor', 'g-not-and'] },
  { id: 'tablas', title: 'Tablas de verdad', summary: 'Calcula la salida de una función para todas las combinaciones de entrada.',
    tip: { text: 'Comprueba tu tabla con la calculadora.', label: 'Abrir la calculadora', href: '#/calculadora' },
    exercises: ['tabla-motor', 'tabla-escalera', 'tabla-riego'] },
  { id: 'expresiones', title: 'De un enunciado a una expresión', summary: 'Traduce una descripción en palabras a una expresión booleana.',
    tip: { text: 'La calculadora te dice si tu expresión da la tabla que esperas.', label: 'Abrir la calculadora', href: '#/calculadora' },
    exercises: ['comparador', 'expr-garaje', 'expr-tanque', 'alarma'] },
  { id: 'simplificacion', title: 'Simplificación', summary: 'Reduce una expresión con las leyes del álgebra y con mapas de Karnaugh.',
    tip: { text: 'El mapa de Karnaugh de la calculadora te ayuda a ver los grupos.', label: 'Abrir la calculadora', href: '#/calculadora' },
    exercises: ['simp-absorcion', 'simp-1', 'simp-demorgan', 'simp-2', 'primos'] },
  { id: 'circuitos', title: 'Circuitos', summary: 'Construye circuitos combinacionales con compuertas.',
    tip: { text: 'La tabla en vivo del editor te dice si tu circuito va bien.', label: 'Abrir el editor', href: '#/editor' },
    exercises: ['medio-sumador', 'decodificador', 'mux', 'mayoria', 'paridad', 'alarma-circuito', 'sumador-completo'] },
  { id: 'universales', title: 'NAND y NOR', summary: 'Construye cualquier función con un solo tipo de compuerta.',
    tip: { text: 'Piensa en las leyes de De Morgan antes de dibujar.', label: 'Ver las leyes', href: '#/calculadora' },
    exercises: ['nand-not', 'nand-or', 'nor-and', 'nand-mux', 'medio-sumador-nand'] },
];

/** Todos los ejercicios en el orden recomendado. */
export const PATH_ORDER: string[] = UNITS.flatMap(u => u.exercises);

export const unitOf = (exerciseId: string): Unit | undefined => UNITS.find(u => u.exercises.includes(exerciseId));

export const unitProgress = (unit: Unit, solved: string[]) => ({ done: unit.exercises.filter(id => solved.includes(id)).length, total: unit.exercises.length });

export type UnitStatus = 'done' | 'current' | 'upcoming';

/** La unidad actual es la primera con ejercicios sin resolver; las anteriores están completas y las siguientes pendientes. */
export const unitStatus = (unit: Unit, solved: string[]): UnitStatus => {
  const p = unitProgress(unit, solved);
  if (p.done === p.total) return 'done';
  const first = UNITS.find(u => unitProgress(u, solved).done < u.exercises.length);
  return first?.id === unit.id ? 'current' : 'upcoming';
};

/** Primer ejercicio sin resolver en el orden de la ruta. */
export const nextRecommended = (solved: string[]): string | null => PATH_ORDER.find(id => !solved.includes(id)) ?? null;

/** Siguiente ejercicio sin resolver después de `id` (si no queda ninguno hacia adelante, el primero pendiente). */
export const nextAfter = (id: string, solved: string[]): string | null => {
  const i = PATH_ORDER.indexOf(id);
  const ahead = PATH_ORDER.slice(i + 1).find(x => !solved.includes(x));
  return ahead ?? PATH_ORDER.find(x => x !== id && !solved.includes(x)) ?? null;
};
