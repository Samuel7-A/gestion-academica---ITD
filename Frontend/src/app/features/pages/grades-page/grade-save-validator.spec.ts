import { describe, expect, it } from 'vitest';
import { parseGradeInput } from './grade-save-validator';

describe('validación de notas con autoguardado', () => {
  it('distingue cero de celda sin nota', () => {
    expect(parseGradeInput('0')).toEqual({ kind: 'value', value: 0 });
    expect(parseGradeInput('')).toEqual({ kind: 'empty' });
    expect(parseGradeInput('   ')).toEqual({ kind: 'empty' });
  });
  it('acepta calificaciones de 0 a 20 y dos decimales', () => {
    expect(parseGradeInput('20')).toEqual({ kind: 'value', value: 20 });
    expect(parseGradeInput('17.50')).toEqual({ kind: 'value', value: 17.5 });
    expect(parseGradeInput('15,75')).toEqual({ kind: 'value', value: 15.75 });
  });
  it('rechaza notas fuera de rango o no numéricas', () => {
    for (const bad of ['-1', '20.01', '21', 'abc', '1e1', '5.123', 'NaN', '1/2']) {
      expect(parseGradeInput(bad)).toEqual({ kind: 'invalid' });
    }
  });
});
