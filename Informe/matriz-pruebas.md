
# Matriz de casos de prueba – APF3

**Proyecto:** Plataforma Inteligente de Gestión Académica Docente  
**Institución:** I.E. Juventud Científica  
**Responsable:** Crhistian Zamora  
**Versión:** 1.0  
**Fecha:** 13/11/2026

## 1. Objetivo

Establecer los casos de prueba necesarios para verificar el funcionamiento de la plataforma de gestión académica, considerando el inicio de sesión, la administración de cursos, estudiantes, actividades, calificaciones y las funcionalidades de Machine Learning.

## 2. Alcance

Las pruebas contemplan los siguientes módulos:

- Autenticación de docentes.
- Gestión de cursos y secciones.
- Consulta de estudiantes.
- Gestión de actividades académicas.
- Registro y actualización de calificaciones.
- Autoguardado y persistencia de notas.
- Predicción del rendimiento académico.
- Clasificación del riesgo académico.
- Generación de grupos de estudiantes.
- Adaptación de la interfaz a dispositivos móviles.
- Comunicación entre frontend, backend y base de datos.

## 3. Matriz de casos de prueba

| Código | Funcionalidad | Caso de prueba | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Login | Ingresar con credenciales correctas | Acceso al sistema | Pendiente |
| CP-02 | Login | Ingresar con credenciales incorrectas | Mostrar mensaje de error | Pendiente |
| CP-03 | Cursos | Consultar cursos asignados | Mostrar cursos del docente | Pendiente |
| CP-04 | Estudiantes | Consultar estudiantes de una sección | Mostrar estudiantes correspondientes | Pendiente |
| CP-05 | Actividades | Registrar una actividad | Guardar la actividad correctamente | Pendiente |
| CP-06 | Calificaciones | Registrar una nota válida | Guardar la calificación | Pendiente |
| CP-07 | Calificaciones | Actualizar una nota existente | Actualizar el valor registrado | Pendiente |
| CP-08 | Autoguardado | Modificar una nota y recargar la página | Conservar el cambio realizado | Pendiente |
| CP-09 | Validaciones | Registrar una nota fuera del rango de 0 a 20 | Rechazar el valor inválido | Pendiente |
| CP-10 | Machine Learning | Consultar el riesgo académico | Mostrar nivel de riesgo | Pendiente |
| CP-11 | Machine Learning | Solicitar predicción de nota final | Mostrar nota proyectada de 0 a 20 | Pendiente |
| CP-12 | Machine Learning | Generar grupos de estudiantes | Crear grupos sin estudiantes duplicados | Pendiente |
| CP-13 | Responsividad | Abrir el sistema desde un celular | Adaptar correctamente la interfaz | Pendiente |
| CP-14 | Integración | Verificar comunicación entre Angular y FastAPI | Obtener respuestas correctas de la API | Pendiente |

## 4. Criterios de evaluación

Cada caso de prueba será evaluado considerando los siguientes estados:

- **Aprobado:** la funcionalidad cumple el resultado esperado.
- **Fallido:** la funcionalidad no cumple el resultado esperado.
- **Pendiente:** la prueba todavía no ha sido ejecutada.
- **No ejecutable:** no se cuenta con las condiciones necesarias para realizar la prueba.

## 5. Consideraciones

- Las pruebas se realizarán utilizando datos sintéticos.
- No se utilizarán datos personales reales de estudiantes.
- Las notas deben respetar el rango establecido de 0 a 20.
- Se verificará que las calificaciones permanezcan guardadas después de recargar la aplicación.
- Los resultados de Machine Learning se consideran demostraciones técnicas basadas en datos sintéticos.
- Se recopilarán capturas de pantalla como evidencia de las pruebas ejecutadas.

## 6. Responsable

**Crhistian Zamora**  
Encargado de la matriz de pruebas, recopilación de evidencias, documentación de resultados y elaboración del plan de mejoras del proyecto APF3.
