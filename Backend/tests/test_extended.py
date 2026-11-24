"""Pruebas de los endpoints que faltaban en APF4. Ejecutar: python -m pytest -q."""

API = "/api/v1"


def test_invitation_requires_admin(client, doc1):
    assert client.post(f"{API}/auth/invitations", json={"email": "nuevo@demo.edu.pe"}).status_code == 401
    assert client.post(f"{API}/auth/invitations", headers=doc1, json={"email": "nuevo@demo.edu.pe"}).status_code == 403


def test_invite_register_login_and_no_reuse(client, admin):
    invitation = client.post(f"{API}/auth/invitations", headers=admin,
                             json={"email": "nuevo@demo.edu.pe"})
    assert invitation.status_code == 201, invitation.text
    token = invitation.json()["invite_token"]
    payload = {"email": "nuevo@demo.edu.pe", "full_name": "Nuevo Docente", "password": "ContrasenaSegura_2026!", "invite_token": token}
    result = client.post(f"{API}/auth/register", json=payload)
    assert result.status_code == 201, result.text
    assert result.json()["role"] == "teacher"
    assert "password_hash" not in result.json()
    assert client.post(f"{API}/auth/login", json={"email": payload["email"], "password": payload["password"]}).status_code == 200
    assert client.post(f"{API}/auth/register", json=payload).status_code == 403


def test_register_denies_fake_invite(client):
    body = {"email": "atacante@demo.edu.pe", "full_name": "Otro Docente",
            "password": "ContrasenaSegura_2026!", "invite_token": "a" * 43}
    assert client.post(f"{API}/auth/register", json=body).status_code == 403


def test_schedule_persists_and_is_authorized(client, doc1, doc2):
    act = "ACT-2026-001-B1-1"
    endpoint = f"{API}/activities/{act}/schedule"
    payload = {"schedule_date": "2026-11-27", "schedule_time": "09:30:00", "room": "A-201", "status": "pendiente"}
    assert client.put(endpoint, json=payload, headers=doc2).status_code == 403
    result = client.put(endpoint, json=payload, headers=doc1)
    assert result.status_code == 200, result.text
    assert result.json()["room"] == "A-201"
    schedules = client.get(f"{API}/course-sections/CS-2026-001/exam-schedules", headers=doc1)
    assert schedules.status_code == 200
    assert any(s["activity_id"] == act and s["status"] == "pendiente" for s in schedules.json())
    assert client.get(f"{API}/course-sections/CS-2026-001/exam-schedules", headers=doc2).status_code == 403
    assert client.delete(endpoint, headers=doc1).status_code == 204
    assert client.delete(endpoint, headers=doc1).status_code == 404


def test_schedule_rejects_invalid_date_or_status(client, doc1):
    endpoint = f"{API}/activities/ACT-2026-001-B1-1/schedule"
    assert client.put(endpoint, headers=doc1, json={"schedule_date": "2026-11-27", "status": "pendiente"}).status_code == 422
    assert client.put(endpoint, headers=doc1, json={"status": "hack"}).status_code == 422


def test_report_history_private_by_teacher(client, doc1, doc2):
    payload = {"course_section_id": "CS-2026-001", "report_type": "notas", "filename": "notas.csv", "row_count": 20}
    assert client.post(f"{API}/reports", json=payload, headers=doc2).status_code == 403
    created = client.post(f"{API}/reports", json=payload, headers=doc1)
    assert created.status_code == 201, created.text
    mine = client.get(f"{API}/reports", headers=doc1)
    assert mine.status_code == 200
    assert len(mine.json()) == 1
    assert mine.json()[0]["filename"] == "notas.csv"
    others = client.get(f"{API}/reports", headers=doc2)
    assert others.status_code == 200
    assert others.json() == []


def test_ready(client):
    assert client.get(f"{API}/ready").json()["status"] == "ready"


def test_expired_invitation_is_rejected(client, admin, db):
    from datetime import timedelta
    from sqlalchemy import select
    from app.models import utcnow
    from app.models_extra import TeacherInvite
    invitation = client.post(f"{API}/auth/invitations", headers=admin,
                             json={"email": "caducado@demo.edu.pe"})
    assert invitation.status_code == 201
    record = db.scalar(select(TeacherInvite).where(TeacherInvite.email == "caducado@demo.edu.pe"))
    record.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    data = {"email": "caducado@demo.edu.pe", "full_name": "Docente Nuevo",
            "password": "ContrasenaSegura_2026!", "invite_token": invitation.json()["invite_token"]}
    assert client.post(f"{API}/auth/register", json=data).status_code == 403


def test_registration_cannot_escalate_to_admin(client, admin):
    invite = client.post(f"{API}/auth/invitations", headers=admin,
                         json={"email": "otro@demo.edu.pe"})
    payload = {"email": "otro@demo.edu.pe", "full_name": "Docente Nuevo",
               "password": "ContrasenaSegura_2026!", "invite_token": invite.json()["invite_token"],
               "role": "admin"}
    response = client.post(f"{API}/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["role"] == "teacher"


def test_admin_can_assign_course_teacher(client, admin, doc1, doc2):
    payload = {"course_section_id": "CS-2026-001", "teacher_id": "USR-DOC-002"}
    assert client.post(f"{API}/admin/assign-course", headers=doc1, json=payload).status_code == 403
    changed = client.post(f"{API}/admin/assign-course", headers=admin, json=payload)
    assert changed.status_code == 200, changed.text
    assert changed.json()["teacher_id"] == "USR-DOC-002"
    assert client.get(f"{API}/course-sections/CS-2026-001/gradebook", headers=doc1).status_code == 403
    assert client.get(f"{API}/course-sections/CS-2026-001/gradebook", headers=doc2).status_code == 200
