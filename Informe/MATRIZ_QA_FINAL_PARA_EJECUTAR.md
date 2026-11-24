# Matriz de QA para cierre final

**Fuente:** casos CP-01–CP-14 del plan QA de Crhistian; ampliar los casos tras la integración. **Estado inicial: pendiente**, no declarar aprobaciones sin evidencia.

| Caso | Prueba observable | Estado | Evidencia requerida |
|---|---|---|---|
| CP-01 | Login docente válido | Pendiente | Captura de Cursos y `/auth/me` |
| CP-02 | Login incorrecto muestra error | Pendiente | Captura del error 401 |
| CP-03 | Lista de cursos propios | Pendiente | Captura de Cursos |
| CP-04 | Estudiantes matriculados por sección | Pendiente | Gradebook |
| CP-05 | Crear actividad válida | Pendiente | POST + nueva actividad |
| CP-06 | Guardar nota 0–20 | Pendiente | Captura y GET |
| CP-07 | Modificar nota | Pendiente | Antes/después |
| CP-08 | Recargar y conservar nota | Pendiente | Video/GET persistencia |
| CP-09 | Rechazar nota fuera de rango | Pendiente | Error visual y 422 |
| CP-10 | Riesgo predictivo | Pendiente | Predicción con `synthetic_data=true` |
| CP-11 | Nota final proyectada | Pendiente | JSON de ML |
| CP-12 | Agrupación sin duplicados | Pendiente | JSON de grupos |
| CP-13 | Pantallas de celular adaptables | Pendiente | Capturas 375 y 768 px |
| CP-14 | Angular ↔ FastAPI | Pendiente | Red Network y health |
| CP-15 | Registro con invitación válida | Pendiente | Alta y login del nuevo docente |
| CP-16 | Invitación falsa/reusada rechazada | Pendiente | 403 |
| CP-17 | Docente A no lee cursos de B | Pendiente | 403 |
| CP-18 | Fecha de examen persiste tras recargar | Pendiente | Capturas antes/después |
| CP-19 | Historial de CSV accesible tras nuevo navegador | Pendiente | Descargar mismo CSV |
| CP-20 | Horario semanal diferente para cada docente | Pendiente | Dos cuentas de prueba |
| CP-21 | Administrador detecta choque de horario | Pendiente | Error 409 |
| CP-22 | Logout y token expirado | Pendiente | 401 / navegación login |
| CP-23 | Versión publicada HTTPS sin errores CORS | Pendiente | URL + Network |

Registrar fecha, responsable, navegador, estado real, resultado esperado vs. obtenido y ruta de la captura. Revisar `Informe/matriz-pruebas.md` de Crhistian antes de la entrega para no duplicar resultados.
