import { UsuarioCourse } from "../models/usuario-curso.model";

export const MOCK_USUARIO_COURSES: UsuarioCourse[] = [
  // Cursos asignados a Carlos Mendoza ("usr-01")
  { id: 1, usuarioId: 'usr-01', courseId: 1 },  // Calculo 5°A
  { id: 2, usuarioId: 'usr-01', courseId: 2 },  // Matematica 5° A
  { id: 3, usuarioId: 'usr-01', courseId: 6 },  // Aritmetica 5°A
  { id: 4, usuarioId: 'usr-01', courseId: 7 },  // Aritmetica 2°A
  { id: 5, usuarioId: 'usr-01', courseId: 10 }, // Calculo 5°B
  { id: 6, usuarioId: 'usr-01', courseId: 11 }, // Calculo 5°C

  // Cursos asignados a Valeria Salazar ("usr-02")
  { id: 7, usuarioId: 'usr-02', courseId: 3 },  // Matematica 5°B
  { id: 8, usuarioId: 'usr-02', courseId: 4 },  // Geografia 5°C
  { id: 9, usuarioId: 'usr-02', courseId: 5 },  // Geografia 2°C
  { id: 10, usuarioId: 'usr-02', courseId: 8 }, // Matematica 4°A
  { id: 11, usuarioId: 'usr-02', courseId: 9 }  // Geografia 3°A
];