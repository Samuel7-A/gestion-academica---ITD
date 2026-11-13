 
export interface Activity {
  id?: number;
  type: 'Curso' | 'Actividad' | 'Prueba';
  day: string;
  title: string;
  detail: string;
}