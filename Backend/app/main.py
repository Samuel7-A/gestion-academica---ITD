import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app import __version__
from app.api.routes import activities, auth, course_sections, health, ml, students
from app.core.config import DEFAULT_JWT_SECRET, settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
logger = logging.getLogger("app")

if settings.jwt_secret_key == DEFAULT_JWT_SECRET:
    logger.warning("JWT_SECRET_KEY no está configurada: se usa una clave de desarrollo. Defínela en .env")

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "API REST de la Plataforma Inteligente de Gestión Académica Docente — I.E. Juventud Científica (APF3).\n\n"
        "**Cómo probar:** ejecuta `POST /api/v1/auth/login`, copia `access_token`, "
        "pulsa **Authorize** y pégalo.\n\n"
        "Todos los datos son sintéticos."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (health.router, auth.router, course_sections.router, activities.router, students.router, ml.router):
    app.include_router(router, prefix=settings.api_v1_prefix)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")
