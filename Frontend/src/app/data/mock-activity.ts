import { Activity } from "../models/activity.model";


export const MOCK_ACTIVITIES: Activity[] = [
  { id: 1, courseId: 2, type: 'Curso', day: 'Martes', title: 'Matematicas 5°A', detail: 'Hora: 2:00 pm a 3:30 pm' },
  { id: 2, courseId: 8, type: 'Actividad', day: 'Miercoles', title: 'Geometria 2°B', detail: 'Presentación de Formar Poligona..' },
  { id: 3, courseId: 6, type: 'Prueba', day: 'Martes', title: 'Aritmetica 3°B', detail: 'Funciones Cuadraticas, num....' }
];