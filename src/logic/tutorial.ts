import type { Bit } from './boolean';
import type { Circuit, GateType } from './circuit';

/** Pasos del tutorial del editor. `done` detecta automáticamente que el alumno lo hizo; sin `done` el paso es manual. */
export type TutorialStep = {
  id: string;
  title: string;
  text: string;
  /** Botón de la paleta que se resalta. */
  highlight?: GateType;
  done?: (circuit: Circuit, values: Map<string, Bit | null>) => boolean;
};

const count = (c: Circuit, type: GateType) => c.nodes.filter(n => n.type === type).length;
const kindOf = (c: Circuit, id: string) => c.nodes.find(n => n.id === id)?.type;
const wiresInto = (c: Circuit, to: GateType, from: GateType) => c.wires.filter(w => kindOf(c, w.to) === to && kindOf(c, w.from) === from).length;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'input1', title: 'Agrega una entrada', highlight: 'INPUT',
    text: 'Arrastra «Entrada» de la paleta al lienzo (o haz clic en ella). Una entrada es un interruptor que vale 0 o 1.',
    done: c => count(c, 'INPUT') >= 1 },
  { id: 'input2', title: 'Agrega una segunda entrada', highlight: 'INPUT',
    text: 'Repite para tener dos entradas. Se llamarán A y B automáticamente.',
    done: c => count(c, 'INPUT') >= 2 },
  { id: 'gate', title: 'Agrega una compuerta AND', highlight: 'AND',
    text: 'La compuerta AND da 1 solo cuando todas sus entradas valen 1. Arrástrala a la derecha de las entradas.',
    done: c => count(c, 'AND') >= 1 },
  { id: 'output', title: 'Agrega una salida', highlight: 'OUTPUT',
    text: 'La salida es un LED: se enciende cuando recibe un 1. Colócala a la derecha de la compuerta.',
    done: c => count(c, 'OUTPUT') >= 1 },
  { id: 'wire1', title: 'Conecta la entrada A',
    text: 'Arrastra desde el círculo de la derecha de A hasta un círculo de la izquierda de la compuerta AND. Si prefieres, haz clic en el origen y luego en el destino.',
    done: c => wiresInto(c, 'AND', 'INPUT') >= 1 },
  { id: 'wire2', title: 'Conecta la entrada B',
    text: 'Haz lo mismo con B hacia la otra entrada de la compuerta. Un círculo rojo significa «sin conectar».',
    done: c => wiresInto(c, 'AND', 'INPUT') >= 2 },
  { id: 'wire3', title: 'Conecta la compuerta a la salida',
    text: 'Arrastra desde el círculo de la derecha de la compuerta hasta el círculo de la salida.',
    done: c => wiresInto(c, 'OUTPUT', 'AND') >= 1 },
  { id: 'toggle', title: 'Enciende las entradas',
    text: 'Haz clic en A y en B para ponerlas en 1. Los cables con 1 se ponen verdes y, con las dos encendidas, el LED se prende: es la función AND.',
    done: (c, values) => c.nodes.some(n => n.type === 'OUTPUT' && values.get(n.id) === 1) },
  { id: 'analysis', title: 'Revisa el análisis',
    text: 'Junto al lienzo está la tabla de verdad con todas las combinaciones: haz clic en una fila para ponerla en el circuito. Explora también Expresión, Karnaugh, Caminos y Costo y chips.' },
  { id: 'next', title: '¡Listo! ¿Y ahora?',
    text: 'Prueba «Solo NAND» o «Simplificar» en el panel de transformaciones, carga el ejemplo «Alarma del laboratorio», o resuelve un problema en la pestaña Ejercicios. Puedes repetir este tutorial con el botón «Tutorial».' },
];
