# Backend — API REST (FastAPI + PostgreSQL)

Responsable: César Suárez.

API de la Plataforma Inteligente de Gestión Académica Docente (APF3). Gestiona autenticación,
cursos, estudiantes, actividades y notas con autoguardado, y expone los endpoints de Machine Learning
que integran el módulo de Samuel (`ml/`).

**Tecnologías:** Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL (Supabase o Docker) ·
Pydantic · JWT + bcrypt · Pytest · Docker Compose.

> Todos los datos son **sintéticos**. Las predicciones son demostraciones técnicas, no decisiones sobre estudiantes reales.

---

## 1. Inicio rápido con Docker (recomendado)

Requisito: Docker Desktop.

```bash
# en la raíz del repositorio
cp .env.example .env          # en Windows: copy .env.example .env
docker compose up --build
```

- API: <http://localhost:8000>
- Documentación interactiva (Swagger): <http://localhost:8000/docs>
- PostgreSQL local: `localhost:5433` (usuario/clave/BD: `apf3` / `apf3` / `gestion_academica`)

Al iniciar, el contenedor espera la base de datos, aplica las migraciones (`alembic upgrade head`)
y, si `SEED_DEMO_DATA=true`, carga los datos de demostración (solo si la base está vacía).

Para borrar todo y empezar de cero: `docker compose down -v`.

## 2. Usuarios de demostración

| Rol | Correo | Contraseña | Cursos |
|---|---|---|---|
| Docente | `docente1@demo.edu.pe` | `Docente123!` | Matemática y Comunicación (`CS-2025-001/002`, `CS-2026-001/002`) |
| Docente | `docente2@demo.edu.pe` | `Docente123!` | Ciencia y Tecnología y Ciencias Sociales (`CS-xxxx-003/004`) |
| Admin | `admin@demo.edu.pe` | `Admin123!` | Todos |

Datos cargados: 20 estudiantes (`STU-001` … `STU-020`) matriculados en 4 cursos en 2025
(histórico, 4 bimestres, con nota final) y en 2026 (solo bimestres 1 y 2, sin nota final).
En 2026 la "Evaluación bimestral 2" (`ACT-2026-00X-B2-3`) está vacía para demostrar el autoguardado.

## 3. Ejecución sin Docker (desarrollo)

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate          # Linux/Mac: source .venv/bin/activate
pip install -r requirements-dev.txt

# Base de datos: levanta solo PostgreSQL con Docker, o usa Supabase (ver sección 4)
docker compose up -d db         # desde la raíz del repo

alembic upgrade head            # crea las tablas
python -m app.db.seed           # datos de demostración (--reset para recargar)
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

## 4. Usar Supabase

1. En Supabase: **Project Settings → Database → Connection string**. Usa el modo
   **Session pooler** (puerto 5432) o la conexión directa.
2. En el archivo `.env` de la raíz define:
   ```
   DATABASE_URL=postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres?sslmode=require
   ```
3. Ejecuta `alembic upgrade head` (o `docker compose up`, que lo hace solo).
   Alternativa: pegar `sql/schema.sql` en el SQL Editor de Supabase.

El backend convierte automáticamente `postgresql://` al driver `psycopg` y desactiva las sentencias
preparadas para ser compatible con el pooler de Supabase.

## 5. Variables de entorno

Se leen del `.env` de la raíz (y opcionalmente de `Backend/.env`). Plantilla: [`../.env.example`](../.env.example).

| Variable | Por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | PostgreSQL local en `localhost:5433` | Cadena de conexión (Supabase o local) |
| `JWT_SECRET_KEY` | clave de desarrollo | **Cambiar** en cualquier entorno compartido |
| `JWT_EXPIRE_MINUTES` | `480` | Vigencia del token |
| `CORS_ORIGINS` | `http://localhost:4200,http://127.0.0.1:4200` | Orígenes de Angular permitidos |
| `SEED_DEMO_DATA` | `true` en Docker | Cargar datos de demostración al iniciar |
| `ML_MODULE` | vacío (autodetecta) | Módulo con las funciones de ML |
| `ML_MODEL_VERSION` | `demo-v1` | Versión que se informa cuando responde el modelo real |

## 6. Endpoints (`/api/v1`)

Autenticación con `Authorization: Bearer <token>` en todos salvo `login` y `health`.
En `/docs`: ejecuta `POST /auth/login`, copia `access_token`, pulsa **Authorize** y pégalo.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | `{"email","password"}` → `access_token`, `token_type`, `expires_in`, `user` |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/course-sections` | Cursos-sección del docente (con `student_count`) |
| GET | `/course-sections/{id}/students` | Estudiantes matriculados |
| GET | `/course-sections/{id}/activities` | Actividades (ordenadas por bimestre) |
| POST | `/course-sections/{id}/activities` | `{"bimester":1-4,"title":"..."}` → 201 |
| GET | `/course-sections/{id}/gradebook` | Actividades + estudiantes con sus notas y promedios por bimestre |
| PUT | `/activities/{id}/grades/{student_id}` | **Autoguardado**: `{"value":15.5}` → nota con `updated_at` |
| DELETE | `/activities/{id}/grades/{student_id}` | Borra la nota (celda vaciada) → 204 *(adicional)* |
| GET | `/students/{id}/academic-history` | Historial por año y curso (nota final solo en años completados) |
| POST | `/ml/predict` | `{"student_id","course_section_id"}` → nota proyectada y riesgo |
| POST | `/ml/groups` | `{"course_section_id","n_groups"}` → `groups: [{group_number, student_ids}]` |
| GET | `/health` | Estado de la API, la base de datos y el modo ML |

**Errores:** `401` sin token o token inválido · `403` curso/estudiante de otro docente ·
`404` recurso inexistente o estudiante no matriculado · `409` datos insuficientes para predecir ·
`422` validación (nota fuera de 0–20, bimestre fuera de 1–4, `n_groups` inválido).

Ejemplo de predicción:

```json
{
  "student_id": "STU-001",
  "course_section_id": "CS-2026-001",
  "predicted_final_grade": 16.8,
  "risk_level": "bajo",
  "synthetic_data": true,
  "model_version": "mock-v0",
  "features": {
    "grade_bimester_1": 17.33, "grade_bimester_2": 15.47,
    "attendance_pct": 97.1, "homework_pct": 87.9, "participation_pct": 83.1,
    "previous_average": 16.95
  }
}
```

## 7. Base de datos

Tablas: `users`, `students`, `courses`, `sections`, `course_sections`, `enrollments`, `activities`,
`grades`, `academic_indicators`, `annual_results` (modelos en [`app/models.py`](app/models.py),
migración en [`alembic/versions/`](alembic/versions/), SQL en [`sql/schema.sql`](sql/schema.sql)).

Reglas aplicadas en la propia base de datos:
- Identificadores de texto (`STU-001`, `CRS-MAT`, `CS-2026-001`).
- Notas entre 0 y 20; porcentajes entre 0 y 100; bimestre entre 1 y 4.
- `UNIQUE(activity_id, student_id)` en `grades`: una sola nota por estudiante y actividad.
- `annual_results` solo para años históricos completados.

Campo adicional respecto al plan: `users.full_name` (opcional, para mostrar el nombre del docente).

Promedios: promedio de bimestre = media de las notas de sus actividades; `current_average` = media de
los bimestres con notas (la nota anual es el promedio de los 4 bimestres).

**Cargar el dataset de Samuel:** debe respetar estas tablas e identificadores. Para cambios en el
esquema: modificar `app/models.py` y ejecutar `alembic revision --autogenerate -m "descripcion"`.

## 8. Integración con Machine Learning

Archivo: [`app/services/ml_service.py`](app/services/ml_service.py).

El backend obtiene de la base de datos las 6 variables acordadas y llama a las funciones de Samuel:

```python
features = {
    "grade_bimester_1": 14.2,   # promedio de actividades del bimestre 1
    "grade_bimester_2": 13.8,   # promedio de actividades del bimestre 2
    "attendance_pct": 92.0,     # academic_indicators
    "homework_pct": 85.0,
    "participation_pct": 70.0,
    "previous_average": 13.5,
}
predict_risk(features)            # -> "bajo" | "moderado" | "alto"
predict_final_grade(features)     # -> float 0..20
generate_groups(students, n_groups)
# students = [{"student_id": "STU-001", **features}, ...]
# -> [["STU-001", ...], ...]  o  {"groups": [{"group_number": 1, "student_ids": [...]}]}
```

- **Autodetección:** busca las funciones en `ml`, `ml.inference`, `ml.predict` y `ml.src.inference`
  (o en el módulo indicado en `ML_MODULE`). Basta con que Samuel las exponga en `ml/__init__.py`
  o en `ml/inference.py`; no hay que cambiar el backend.
- **Dependencias de ML:** si existe `ml/requirements.txt`, la imagen Docker lo instala.
- **Modo simulado:** mientras las funciones no existan, o si fallan o devuelven grupos inválidos,
  la API responde con el mismo formato y `model_version: "mock-v0"`. `GET /health` indica `ml_mode`.
- Se aceptan resultados como `str`, `float`, `dict`, listas o arrays de NumPy; el riesgo se normaliza
  a `bajo/moderado/alto`.
- Si un estudiante no tiene notas de bimestre 1–2 o indicadores, `/ml/predict` responde `409`.
  En `/ml/groups` los valores faltantes se completan con la media de la sección.

## 9. Pruebas

```bash
cd Backend
pytest
```

Usan SQLite en memoria con los mismos modelos y datos de demostración (no requieren Docker).
Cubren: login correcto/incorrecto, token inválido/expirado, contraseñas con hash, acceso solo a
cursos propios (403), consulta de estudiantes y actividades, registro y actualización de notas,
persistencia al volver a consultar, notas fuera de rango (422), ausencia de duplicados, historial
académico, predicción, grupos sin duplicados y equilibrados, y el adaptador de ML.

## 10. Estructura

```
Backend/
├── app/
│   ├── main.py               # App FastAPI, CORS y rutas
│   ├── core/                 # Configuración, JWT y hash de contraseñas
│   ├── db/                   # Sesión SQLAlchemy y datos de demostración (seed)
│   ├── models.py             # Tablas
│   ├── schemas.py            # Validación y formato JSON
│   ├── api/deps.py           # Usuario autenticado y permisos por docente
│   ├── api/routes/           # Endpoints
│   ├── services/             # Promedios e integración ML
│   └── prestart.py           # Espera BD + migraciones + seed (Docker)
├── alembic/                  # Migraciones
├── sql/schema.sql            # Esquema SQL generado
├── ml/                       # Módulo de Samuel
├── tests/                    # Pytest
├── Dockerfile
└── requirements.txt
```
