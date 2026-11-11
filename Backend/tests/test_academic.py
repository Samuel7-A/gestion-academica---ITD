API = "/api/v1"


# ---------- Cursos y secciones ----------

def test_docente_solo_ve_sus_cursos(client, doc1):
    res = client.get(f"{API}/course-sections", headers=doc1)
    assert res.status_code == 200
    ids = {cs["id"] for cs in res.json()}
    assert ids == {"CS-2025-001", "CS-2025-002", "CS-2026-001", "CS-2026-002"}
    cs = next(c for c in res.json() if c["id"] == "CS-2026-001")
    assert cs["course_name"] == "Matemática"
    assert cs["year"] == 2026
    assert cs["student_count"] == 20


def test_admin_ve_todos_los_cursos(client, admin):
    res = client.get(f"{API}/course-sections", headers=admin)
    assert len(res.json()) == 8


def test_cursos_requiere_autenticacion(client):
    assert client.get(f"{API}/course-sections").status_code == 401


def test_estudiantes_de_su_curso(client, doc1):
    res = client.get(f"{API}/course-sections/CS-2026-001/students", headers=doc1)
    assert res.status_code == 200
    students = res.json()
    assert len(students) == 20
    assert set(students[0]) == {"id", "code", "full_name"}


def test_estudiantes_de_curso_ajeno_403(client, doc1):
    res = client.get(f"{API}/course-sections/CS-2026-003/students", headers=doc1)
    assert res.status_code == 403


def test_curso_inexistente_404(client, doc1):
    assert client.get(f"{API}/course-sections/CS-9999-001/students", headers=doc1).status_code == 404


# ---------- Actividades ----------

def test_listar_actividades(client, doc1):
    res = client.get(f"{API}/course-sections/CS-2026-001/activities", headers=doc1)
    assert res.status_code == 200
    activities = res.json()
    assert len(activities) == 6
    assert {a["bimester"] for a in activities} == {1, 2}  # 2026: solo bimestres 1 y 2


def test_crear_actividad(client, doc1):
    res = client.post(
        f"{API}/course-sections/CS-2026-001/activities",
        headers=doc1,
        json={"bimester": 2, "title": "  Exposición grupal  "},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["id"].startswith("ACT-")
    assert body["title"] == "Exposición grupal"
    assert body["course_section_id"] == "CS-2026-001"

    listed = client.get(f"{API}/course-sections/CS-2026-001/activities", headers=doc1).json()
    assert body["id"] in {a["id"] for a in listed}


def test_crear_actividad_bimestre_invalido(client, doc1):
    for bimester in (0, 5):
        res = client.post(
            f"{API}/course-sections/CS-2026-001/activities", headers=doc1, json={"bimester": bimester, "title": "X"}
        )
        assert res.status_code == 422


def test_crear_actividad_titulo_vacio(client, doc1):
    res = client.post(f"{API}/course-sections/CS-2026-001/activities", headers=doc1, json={"bimester": 1, "title": "  "})
    assert res.status_code == 422


def test_crear_actividad_en_curso_ajeno_403(client, doc2):
    res = client.post(f"{API}/course-sections/CS-2026-001/activities", headers=doc2, json={"bimester": 1, "title": "X"})
    assert res.status_code == 403


# ---------- Registro de notas ----------

def test_gradebook(client, doc1):
    res = client.get(f"{API}/course-sections/CS-2026-001/gradebook", headers=doc1)
    assert res.status_code == 200
    body = res.json()
    assert body["course_section"]["id"] == "CS-2026-001"
    assert len(body["activities"]) == 6
    assert len(body["students"]) == 20
    row = body["students"][0]
    assert len(row["grades"]) == 5  # la evaluación del bimestre 2 aún está vacía
    assert row["bimester_averages"]["bimester_1"] is not None
    assert row["bimester_averages"]["bimester_3"] is None
    assert 0 <= row["current_average"] <= 20


def test_gradebook_ajeno_403(client, doc2):
    assert client.get(f"{API}/course-sections/CS-2026-001/gradebook", headers=doc2).status_code == 403


def _grade_of(client, headers, cs_id, student_id, activity_id):
    book = client.get(f"{API}/course-sections/{cs_id}/gradebook", headers=headers).json()
    row = next(s for s in book["students"] if s["student_id"] == student_id)
    return next((g for g in row["grades"] if g["activity_id"] == activity_id), None)


def test_registrar_nota_nueva_y_persistencia(client, doc1):
    activity = "ACT-2026-001-B2-3"  # vacía en la demo
    assert _grade_of(client, doc1, "CS-2026-001", "STU-001", activity) is None

    res = client.put(f"{API}/activities/{activity}/grades/STU-001", headers=doc1, json={"value": 15.5})
    assert res.status_code == 200
    body = res.json()
    assert body["value"] == 15.5
    assert body["activity_id"] == activity
    assert body["student_id"] == "STU-001"
    assert body["updated_at"]

    # "Recargar la página": la nota se vuelve a consultar desde la base de datos.
    saved = _grade_of(client, doc1, "CS-2026-001", "STU-001", activity)
    assert saved["value"] == 15.5


def test_actualizar_nota_existente(client, doc1):
    url = f"{API}/activities/ACT-2026-001-B1-1/grades/STU-002"
    first = client.put(url, headers=doc1, json={"value": 10}).json()
    second = client.put(url, headers=doc1, json={"value": 18.25}).json()
    assert second["id"] == first["id"]  # misma nota, no un duplicado
    assert second["value"] == 18.25
    assert second["updated_at"] >= first["updated_at"]
    assert _grade_of(client, doc1, "CS-2026-001", "STU-002", "ACT-2026-001-B1-1")["value"] == 18.25


def test_no_hay_notas_duplicadas(client, doc1, db):
    from sqlalchemy import func, select

    from app.models import Grade

    url = f"{API}/activities/ACT-2026-001-B2-3/grades/STU-003"
    for value in (11, 12, 13):
        client.put(url, headers=doc1, json={"value": value})
    count = db.scalar(
        select(func.count()).where(Grade.activity_id == "ACT-2026-001-B2-3", Grade.student_id == "STU-003")
    )
    assert count == 1


def test_nota_fuera_de_rango_422(client, doc1):
    url = f"{API}/activities/ACT-2026-001-B1-1/grades/STU-001"
    for value in (-0.5, 20.5, 25):
        assert client.put(url, headers=doc1, json={"value": value}).status_code == 422
    assert client.put(url, headers=doc1, json={"value": "quince"}).status_code == 422
    assert client.put(url, headers=doc1, json={}).status_code == 422


def test_nota_en_limites_validos(client, doc1):
    url = f"{API}/activities/ACT-2026-001-B1-1/grades/STU-001"
    assert client.put(url, headers=doc1, json={"value": 0}).json()["value"] == 0
    assert client.put(url, headers=doc1, json={"value": 20}).json()["value"] == 20


def test_nota_en_actividad_ajena_403(client, doc2):
    res = client.put(f"{API}/activities/ACT-2026-001-B1-1/grades/STU-001", headers=doc2, json={"value": 14})
    assert res.status_code == 403


def test_nota_actividad_inexistente_404(client, doc1):
    res = client.put(f"{API}/activities/ACT-NO-EXISTE/grades/STU-001", headers=doc1, json={"value": 14})
    assert res.status_code == 404


def test_nota_estudiante_no_matriculado_404(client, doc1, db):
    from app.models import Student

    db.add(Student(id="STU-999", code="JC-9999", full_name="Estudiante Sin Matrícula"))
    db.commit()
    res = client.put(f"{API}/activities/ACT-2026-001-B1-1/grades/STU-999", headers=doc1, json={"value": 14})
    assert res.status_code == 404


def test_borrar_nota(client, doc1):
    url = f"{API}/activities/ACT-2026-001-B1-1/grades/STU-004"
    assert client.delete(url, headers=doc1).status_code == 204
    assert _grade_of(client, doc1, "CS-2026-001", "STU-004", "ACT-2026-001-B1-1") is None
    assert client.delete(url, headers=doc1).status_code == 404


# ---------- Historial académico ----------

def test_historial_academico(client, doc1):
    res = client.get(f"{API}/students/STU-001/academic-history", headers=doc1)
    assert res.status_code == 200
    body = res.json()
    assert body["student"]["id"] == "STU-001"
    assert len(body["records"]) == 8  # 4 cursos × 2 años
    hist = [r for r in body["records"] if r["year"] == 2025]
    actual = [r for r in body["records"] if r["year"] == 2026]
    assert all(r["final_grade"] is not None for r in hist)
    assert all(r["final_grade"] is None for r in actual)  # 2026 no tiene nota final
    assert all(r["bimester_averages"]["bimester_4"] is not None for r in hist)
    assert all(r["bimester_averages"]["bimester_3"] is None for r in actual)


def test_historial_estudiante_inexistente_404(client, doc1):
    assert client.get(f"{API}/students/STU-404/academic-history", headers=doc1).status_code == 404


def test_historial_estudiante_ajeno_403(client, doc1, db):
    from app.models import Student

    db.add(Student(id="STU-999", code="JC-9999", full_name="Estudiante De Otro Docente"))
    db.commit()
    assert client.get(f"{API}/students/STU-999/academic-history", headers=doc1).status_code == 403
