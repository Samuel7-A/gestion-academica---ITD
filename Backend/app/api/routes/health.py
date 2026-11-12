import logging

from fastapi import APIRouter
from sqlalchemy import text

from app import __version__
from app.api.deps import DbSession
from app.schemas import HealthOut
from app.services.ml_service import ml_adapter

router = APIRouter(tags=["Sistema"])
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthOut, summary="Estado de la API, la base de datos y ML")
def health(db: DbSession) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        logger.exception("La base de datos no responde")
        database = "error"
    return HealthOut(
        status="ok" if database == "ok" else "degraded",
        database=database,
        ml_mode=ml_adapter.mode,
        version=__version__,
    )
