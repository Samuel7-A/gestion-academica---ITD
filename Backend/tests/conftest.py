"""Las pruebas usan SQLite en memoria con los mismos modelos y datos de demostración,
así se ejecutan sin PostgreSQL ni Docker."""

import os

os.environ["JWT_SECRET_KEY"] = "clave-solo-para-pruebas-0123456789abcdef"
os.environ["BCRYPT_ROUNDS"] = "4"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.seed import ADMIN_PASSWORD, DEMO_PASSWORD, seed_demo_data
from app.db.session import get_db
from app.main import app
from app.models import Base

engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _):
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db():
    Base.metadata.create_all(engine)
    session = TestingSession()
    seed_demo_data(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db):
    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture()
def doc1(client):
    """Docente 1: Matemática y Comunicación (CS-2025-001/002, CS-2026-001/002)."""
    return _login(client, "docente1@demo.edu.pe", DEMO_PASSWORD)


@pytest.fixture()
def doc2(client):
    """Docente 2: Ciencia y Tecnología y Ciencias Sociales (CS-xxxx-003/004)."""
    return _login(client, "docente2@demo.edu.pe", DEMO_PASSWORD)


@pytest.fixture()
def admin(client):
    return _login(client, "admin@demo.edu.pe", ADMIN_PASSWORD)
