"""Configuración leída desde variables de entorno o desde el archivo .env."""

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent

DEFAULT_DATABASE_URL = "postgresql+psycopg://apf3:apf3@localhost:5433/gestion_academica"
DEFAULT_JWT_SECRET = "dev-solo-local-cambiar-en-env-0123456789abcdef"


class Settings(BaseSettings):
    # Se lee primero el .env de la raíz del repo y luego Backend/.env (este último tiene prioridad).
    # Las variables de entorno reales siempre tienen prioridad sobre ambos archivos.
    model_config = SettingsConfigDict(
        env_file=(REPO_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"  # development | production
    app_name: str = "API Gestión Académica APF3"
    api_v1_prefix: str = "/api/v1"

    database_url: str = DEFAULT_DATABASE_URL

    jwt_secret_key: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    # Costo de bcrypt (12 en producción; las pruebas usan 4 para ir más rápido).
    bcrypt_rounds: int = 12

    # Orígenes permitidos para Angular, separados por comas.
    cors_origins: str = "http://localhost:4200,http://127.0.0.1:4200"

    # Módulo Python con predict_risk / predict_final_grade / generate_groups.
    # Vacío = se autodetecta dentro de Backend/ml/.
    ml_module: str = ""
    ml_model_version: str = "demo-v1"

    # Si es true, al iniciar el contenedor se cargan datos sintéticos de demostración.
    seed_demo_data: bool = False

    @model_validator(mode="after")
    def protect_production(self):
        if self.app_env == "production":
            if (self.jwt_secret_key == DEFAULT_JWT_SECRET or
                    self.jwt_secret_key.startswith("cambia-") or len(self.jwt_secret_key) < 32):
                raise ValueError("JWT_SECRET_KEY fuerte es obligatorio en producción")
            if self.seed_demo_data:
                raise ValueError("SEED_DEMO_DATA debe ser false en producción")
            if self.database_url == DEFAULT_DATABASE_URL or "@localhost:" in self.database_url:
                raise ValueError("DATABASE_URL externa es obligatoria en producción")
            origins = self.cors_origins_list
            if not origins or any(not url.startswith("https://") for url in origins):
                raise ValueError("CORS_ORIGINS debe contener solo dominios HTTPS en producción")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Acepta URLs al estilo Supabase (postgresql://...), fuerza el driver psycopg 3
        y exige SSL cuando la base está en Supabase."""
        url = self.database_url.strip() or DEFAULT_DATABASE_URL
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                url = "postgresql+psycopg://" + url[len(prefix):]
                break
        if ".supabase." in url and "sslmode=" not in url:
            url += ("&" if "?" in url else "?") + "sslmode=require"
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
