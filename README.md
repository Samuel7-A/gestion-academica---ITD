# Plataforma Inteligente de Gestión Académica Docente — APF3

Proyecto académico para la I.E. Juventud Científica.

## Organización del trabajo

- **Frontend/** — Sebastián Bellido: Angular + TypeScript, una sola aplicación web responsiva para PC, tablet y celular.
- **Backend/** — César Suárez: FastAPI, PostgreSQL, endpoints y Docker.
- **Backend/ml/** — Samuel Torres: datos sintéticos, clasificación, regresión y K-Means; integración coordinada con César.
- **Informe/** — Crhistian Zamora: prototipo Figma de la experiencia móvil, casos de prueba, evidencias y mejoras.

## Acuerdos

- Un solo sistema, no una app móvil independiente.
- Endpoint base de la API: `/api/v1` (según la propuesta técnica del equipo).
- Datos sintéticos, no registros reales de estudiantes.
- **No subir** contraseñas, tokens o archivos `.env` privados.

## Ejecutar el sistema (Docker Compose)

```bash
cp .env.example .env      # Windows: copy .env.example .env
docker compose up --build
```

- API y documentación: <http://localhost:8000/docs> (usuario demo: `docente1@demo.edu.pe` / `Docente123!`)
- Detalles del backend, endpoints y Supabase: [Backend/README.md](Backend/README.md)

> Esta es solo la estructura inicial; cada responsable agregará su código y documentos.
