"""Motor y sesiones de SQLAlchemy."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_url = settings.sqlalchemy_database_url
_connect_args: dict = {}
if _url.startswith("postgresql+psycopg"):
    # Desactiva sentencias preparadas: necesario con el pooler de Supabase (PgBouncer).
    _connect_args["prepare_threshold"] = None

engine = create_engine(_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
