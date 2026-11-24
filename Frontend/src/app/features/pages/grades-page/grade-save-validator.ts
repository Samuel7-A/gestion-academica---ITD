/** Validación de entradas para notas. No confundir una celda vacía con nota 0. */
export type ParsedGrade =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'value'; value: number };

export function parseGradeInput(raw: string): ParsedGrade {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return { kind: 'empty' };
  // Acepta hasta dos decimales; rechaza exponentes, signos y letras.
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(normalized)) return { kind: 'invalid' };
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 20) return { kind: 'invalid' };
  return { kind: 'value', value };
}
