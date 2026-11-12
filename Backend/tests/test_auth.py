from app.db.seed import DEMO_PASSWORD

API = "/api/v1"


def test_health(client):
    res = client.get(f"{API}/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["ml_mode"] in ("model", "mock")


def test_login_correcto(client):
    res = client.post(f"{API}/auth/login", json={"email": "docente1@demo.edu.pe", "password": DEMO_PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] > 0
    assert body["user"]["id"] == "USR-DOC-001"
    assert "password_hash" not in body["user"]


def test_login_ignora_mayusculas_en_email(client):
    res = client.post(f"{API}/auth/login", json={"email": "  Docente1@Demo.edu.pe ", "password": DEMO_PASSWORD})
    assert res.status_code == 200


def test_login_password_incorrecta(client):
    res = client.post(f"{API}/auth/login", json={"email": "docente1@demo.edu.pe", "password": "otra"})
    assert res.status_code == 401


def test_login_usuario_inexistente(client):
    res = client.post(f"{API}/auth/login", json={"email": "nadie@demo.edu.pe", "password": DEMO_PASSWORD})
    assert res.status_code == 401


def test_login_cuerpo_invalido(client):
    res = client.post(f"{API}/auth/login", json={"email": "docente1@demo.edu.pe"})
    assert res.status_code == 422


def test_password_guardada_con_hash(db):
    from app.models import User

    user = db.get(User, "USR-DOC-001")
    assert user.password_hash != DEMO_PASSWORD
    assert user.password_hash.startswith("$2")


def test_me_con_token(client, doc1):
    res = client.get(f"{API}/auth/me", headers=doc1)
    assert res.status_code == 200
    assert res.json() == {
        "id": "USR-DOC-001",
        "email": "docente1@demo.edu.pe",
        "role": "teacher",
        "full_name": "Lucía Ramos Vega",
    }


def test_me_sin_token(client):
    assert client.get(f"{API}/auth/me").status_code == 401


def test_me_token_invalido(client):
    res = client.get(f"{API}/auth/me", headers={"Authorization": "Bearer abc.def.ghi"})
    assert res.status_code == 401


def test_me_token_expirado(client, monkeypatch):
    from app.core import security

    monkeypatch.setattr(security.settings, "jwt_expire_minutes", -1)
    token, _ = security.create_access_token("USR-DOC-001")
    res = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "expir" in res.json()["detail"]
