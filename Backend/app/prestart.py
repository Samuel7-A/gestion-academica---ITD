"""Se ejecuta antes de levantar la API en Docker: espera la BD, migra y (opcional) carga la demo."""

import logging
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.core.config import settings
from app.db.seed import seed_demo_data
from app.db.session import SessionLocal, engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s [prestart] %(message)s")
logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[1]


def wait_for_db(attempts: int = 20, delay: float = 2.0) -> None:
    for i in range(1, attempts + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception as exc:
            logger.info("Esperando la base de datos (%s/%s): %s", i, attempts, exc.__class__.__name__)
            time.sleep(delay)
    raise SystemExit("No se pudo conectar a la base de datos. Revisa DATABASE_URL.")


def main() -> None:
    wait_for_db()
    logger.info("Aplicando migraciones...")
    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.attributes["configure_logger"] = False  # conserva el formato de logs de este script
    command.upgrade(alembic_cfg, "head")
    if settings.seed_demo_data:
        with SessionLocal() as db:
            loaded = seed_demo_data(db)
        logger.info("Datos de demostración %s", "cargados" if loaded else "ya existentes; no se modificaron")


if __name__ == "__main__":
    main()
