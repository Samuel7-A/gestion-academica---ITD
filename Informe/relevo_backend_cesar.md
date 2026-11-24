# Evidencia de implementación — Relevo Backend APF4

- **Base:** FastAPI, PostgreSQL/Supabase, JWT, Docker, Alembic 0001 y 0002 ya existentes (César).
- **Ampliaciones:** invitaciones por administrador con token de un solo uso y vigencia, alta de docentes sin permitir elegir rol, asignación de cursos por administrador, programación de exámenes y persistencia de metadatos de reportes; migración 0003.
- **Control de acceso:** operación de invitación solo admin, horarios y reportes restringidos por curso y docente, consulta de reportes filtrada por dueño, validación Pydantic.
- **Seguridad adicional:** hash de contraseñas existente bcrypt, solo se almacena hash de invitación, cabeceras de seguridad, validación de configuración productiva; nuevas tablas con RLS activado en PostgreSQL.
- **Pruebas nuevas:** `Backend/tests/test_extended.py` (invitación protegida, creación de docente, no reutilización, acceso denegado por rol, horarios, errores 422, historial propio, readiness).
- **Verificación local:** ejecutar `python -m pytest -q --disable-warnings` y `docker compose up -d --build` en el repositorio original; copiar resultados concretos aquí antes de la entrega. **No atribuir resultados no ejecutados.**
- **Limitaciones:** API de horarios y reportes pendiente de consumir por Angular, despliegue público requiere credenciales privadas y validación, registros reales de menores no autorizados.
