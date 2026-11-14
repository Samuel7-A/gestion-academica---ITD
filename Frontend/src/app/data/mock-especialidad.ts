import type { Especialidad } from '../models/especialidad.model';

/** Datos de demostración, NO consultan la base PostgreSQL/Supabase. */
export const especialidadesMock: Especialidad[] = [
  { id: 'ESP-MAT', nombre: 'Matemática', activo: true },
  { id: 'ESP-COM', nombre: 'Comunicación', activo: true },
  { id: 'ESP-CYT', nombre: 'Ciencia y Tecnología', activo: true },
  { id: 'ESP-CCSS', nombre: 'Ciencias Sociales', activo: true },
];
