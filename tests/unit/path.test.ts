import { describe, expect, it } from 'vitest';
import { EXERCISES, generateRandomExercise } from '../../src/logic/exercises';
import { PATH_ORDER, UNITS, nextAfter, nextRecommended, unitOf, unitProgress, unitStatus } from '../../src/logic/path';

describe('ruta de aprendizaje', () => {
  it('cada ejercicio del banco pertenece a exactamente una unidad, y no hay ids inventados', () => {
    const ids = EXERCISES.map(e => e.id);
    expect(PATH_ORDER.length).toBe(new Set(PATH_ORDER).size); // sin repetidos
    for (const id of PATH_ORDER) expect(ids, `${id} no existe`).toContain(id);
    for (const id of ids) expect(PATH_ORDER, `${id} sin unidad`).toContain(id);
  });

  it('el campo unit de cada ejercicio coincide con la unidad donde aparece', () => {
    for (const e of EXERCISES) expect(unitOf(e.id)?.id, e.id).toBe(e.unit);
  });

  it('las unidades van de lo fácil a lo difícil: el nivel medio no baja entre unidades salvo en NAND/NOR', () => {
    const avg = UNITS.map(u => u.exercises.reduce((s, id) => s + EXERCISES.find(e => e.id === id)!.level, 0) / u.exercises.length);
    expect(avg[0]).toBeLessThan(avg[avg.length - 1]);
    // dentro de cada unidad el nivel nunca baja más de un escalón respecto al ejercicio anterior
    for (const u of UNITS) {
      const levels = u.exercises.map(id => EXERCISES.find(e => e.id === id)!.level);
      levels.forEach((l, i) => { if (i) expect(l, `${u.id}`).toBeGreaterThanOrEqual(levels[i - 1] - 1); });
    }
  });

  it('el estado de las unidades y el siguiente recomendado siguen el progreso', () => {
    expect(nextRecommended([])).toBe(PATH_ORDER[0]);
    expect(unitStatus(UNITS[0], [])).toBe('current');
    expect(unitStatus(UNITS[1], [])).toBe('upcoming');
    const u0 = UNITS[0].exercises;
    expect(unitStatus(UNITS[0], u0)).toBe('done');
    expect(unitStatus(UNITS[1], u0)).toBe('current');
    expect(unitProgress(UNITS[0], [u0[0]])).toEqual({ done: 1, total: u0.length });
    expect(nextRecommended(u0)).toBe(UNITS[1].exercises[0]);
    expect(nextRecommended(PATH_ORDER)).toBeNull();
  });

  it('nextAfter avanza en la ruta, salta lo resuelto y vuelve a lo pendiente al final', () => {
    expect(nextAfter(PATH_ORDER[0], [])).toBe(PATH_ORDER[1]);
    expect(nextAfter(PATH_ORDER[0], [PATH_ORDER[1]])).toBe(PATH_ORDER[2]);
    const last = PATH_ORDER[PATH_ORDER.length - 1];
    expect(nextAfter(last, PATH_ORDER.slice(1, -1))).toBe(PATH_ORDER[0]); // solo queda el primero
    expect(nextAfter(last, PATH_ORDER.filter(x => x !== last))).toBeNull(); // nada más por resolver
    expect(nextAfter('rand-123', [])).toBe(PATH_ORDER[0]); // un ejercicio fuera de la ruta
  });

  it('un ejercicio aleatorio queda en la práctica libre, fuera de la ruta', () => {
    const e = generateRandomExercise(5, 3);
    expect(e.unit).toBe('libre');
    expect(unitOf(e.id)).toBeUndefined();
  });
});
