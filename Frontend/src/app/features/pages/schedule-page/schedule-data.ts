/**
 * Horario semanal ILUSTRATIVO del prototipo de Figma.
 * No procede de PostgreSQL ni de la programación de exámenes.
 * Reemplazar por API de horarios de clases si se implementa ese módulo.
 */
export type DayId = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';
export type SlotId = '07-09' | '09-11' | '11-13' | 'receso' | '14-16';
export type ClassSlotId = Exclude<SlotId, 'receso'>;
export type ColorTone = 'azul' | 'verde' | 'violeta' | 'rosa' | 'naranja';

export interface WeekDay {
  id: DayId;
  name: string;
}
export interface ScheduleSlot {
  id: SlotId;
  label: string;
  isBreak?: boolean;
}
export interface WeeklyClass {
  id: string;
  day: DayId;
  slot: ClassSlotId;
  subject: string;
  group: string;
  place: string;
  teacher: string;
  tone: ColorTone;
}

export const WEEK_DAYS: readonly WeekDay[] = [
  { id: 'lunes', name: 'Lunes' },
  { id: 'martes', name: 'Martes' },
  { id: 'miercoles', name: 'Miércoles' },
  { id: 'jueves', name: 'Jueves' },
  { id: 'viernes', name: 'Viernes' }
];

export const TIME_SLOTS: readonly ScheduleSlot[] = [
  { id: '07-09', label: '07:00 - 09:00' },
  { id: '09-11', label: '09:00 - 11:00' },
  { id: '11-13', label: '11:00 - 13:00' },
  { id: 'receso', label: '13:00 - 14:00', isBreak: true },
  { id: '14-16', label: '14:00 - 16:00' }
];

// Distribución visual basada en las capturas facilitadas por el equipo.
export const SAMPLE_CLASSES: readonly WeeklyClass[] = [
  { id: 'L1', day: 'lunes', slot: '07-09', subject: 'Matemática', group: '5°A', place: 'Aula 302', teacher: 'Dr. Torres', tone: 'azul' },
  { id: 'X1', day: 'miercoles', slot: '07-09', subject: 'Matemática', group: '5°A', place: 'Aula 302', teacher: 'Dr. Torres', tone: 'azul' },
  { id: 'V1', day: 'viernes', slot: '07-09', subject: 'Comunicación', group: '5°A', place: 'Aula 104', teacher: 'Dra. Okonkwo', tone: 'violeta' },
  { id: 'M2', day: 'martes', slot: '09-11', subject: 'Ciencia', group: '4°B', place: 'Lab. Química', teacher: 'Dr. Torres', tone: 'verde' },
  { id: 'J2', day: 'jueves', slot: '09-11', subject: 'Ciencia', group: '4°B', place: 'Lab. Química', teacher: 'Dr. Torres', tone: 'verde' },
  { id: 'V2', day: 'viernes', slot: '09-11', subject: 'Historia', group: '4°B', place: 'Aula 305', teacher: 'Dra. Smith', tone: 'naranja' },
  { id: 'L3', day: 'lunes', slot: '11-13', subject: 'Inglés', group: '3°C', place: 'Aula 201', teacher: 'Dra. Smith', tone: 'rosa' },
  { id: 'M3', day: 'martes', slot: '11-13', subject: 'Comunicación', group: '5°A', place: 'Aula 104', teacher: 'Dra. Okonkwo', tone: 'violeta' },
  { id: 'X3', day: 'miercoles', slot: '11-13', subject: 'Inglés', group: '3°C', place: 'Aula 201', teacher: 'Dra. Smith', tone: 'rosa' },
  { id: 'J3', day: 'jueves', slot: '11-13', subject: 'Arte', group: '3°C', place: 'Taller de Arte', teacher: 'Dra. Smith', tone: 'verde' },
  { id: 'L4', day: 'lunes', slot: '14-16', subject: 'Arte', group: '3°C', place: 'Taller de Arte', teacher: 'Dra. Smith', tone: 'verde' },
  { id: 'J4', day: 'jueves', slot: '14-16', subject: 'Comunicación', group: '5°A', place: 'Aula 104', teacher: 'Dra. Okonkwo', tone: 'violeta' }
];

export function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - shift);
  return monday;
}

export function shiftMonday(monday: Date, weeks: number): Date {
  const result = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function datePiece(date: Date): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
    .format(date).replace(/\./g, '').replace(/\b[a-záéíóúñ]/g, match => match.toUpperCase());
}

export function weekLabel(monday: Date): string {
  const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
  return monday.getFullYear() === friday.getFullYear()
    ? `${datePiece(monday)} - ${datePiece(friday)}, ${friday.getFullYear()}`
    : `${datePiece(monday)} ${monday.getFullYear()} - ${datePiece(friday)} ${friday.getFullYear()}`;
}

export function classFor(day: DayId, slot: SlotId): WeeklyClass | undefined {
  return SAMPLE_CLASSES.find(item => item.day === day && item.slot === slot);
}
