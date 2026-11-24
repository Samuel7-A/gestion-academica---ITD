import { describe, expect, it } from 'vitest';
import { classFor, mondayOf, SAMPLE_CLASSES, shiftMonday, weekLabel } from './schedule-data';

describe('horario semanal ilustrativo', () => {
  it('inicia la semana en lunes y avanza y retrocede 7 días', () => {
    const monday = mondayOf(new Date(2026, 10, 24)); // martes 24/11/2026
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 10, 23]);
    expect(shiftMonday(monday, 1).getDate()).toBe(30);
    expect(shiftMonday(monday, -1).getDate()).toBe(16);
  });

  it('muestra el rango real de la semana seleccionada', () => {
    const value = weekLabel(new Date(2026, 10, 23));
    expect(value).toContain('23');
    expect(value).toContain('27');
    expect(value).toContain('2026');
  });

  it('no hay dos asignaturas en la misma celda ni clases durante el receso', () => {
    const pairs = SAMPLE_CLASSES.map(item => `${item.day}/${item.slot}`);
    expect(new Set(pairs).size).toBe(SAMPLE_CLASSES.length);
    expect(SAMPLE_CLASSES.some(item => item.slot === ('receso' as typeof item.slot))).toBe(false);
    expect(classFor('lunes', '07-09')?.subject).toBe('Matemática');
    expect(classFor('lunes', 'receso')).toBeUndefined();
  });
});
