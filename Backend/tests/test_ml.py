import pytest

from app.services import ml_service
from app.services.ml_service import (
    MLAdapter,
    normalize_groups,
    normalize_risk,
    risk_from_grade,
)

API = "/api/v1"
FEATURES = {
    "grade_bimester_1": 12.0,
    "grade_bimester_2": 13.0,
    "attendance_pct": 90.0,
    "homework_pct": 80.0,
    "participation_pct": 70.0,
    "previous_average": 12.5,
}


# ---------- Endpoints ----------

def test_predict(client, doc1):
    res = client.post(f"{API}/ml/predict", headers=doc1, json={"student_id": "STU-001", "course_section_id": "CS-2026-001"})
    assert res.status_code == 200
    body = res.json()
    assert body["student_id"] == "STU-001"
    assert 0 <= body["predicted_final_grade"] <= 20
    assert body["risk_level"] in ("bajo", "moderado", "alto")
    assert body["synthetic_data"] is True
    assert body["model_version"]
    assert set(body["features"]) == set(ml_service.FEATURE_NAMES)


def test_predict_riesgo_coherente_con_nota_en_modo_simulado(client, doc1):
    for n in range(1, 21):
        body = client.post(
            f"{API}/ml/predict", headers=doc1, json={"student_id": f"STU-{n:03d}", "course_section_id": "CS-2026-001"}
        ).json()
        if body["model_version"] == ml_service.MOCK_MODEL_VERSION:
            assert body["risk_level"] == risk_from_grade(body["predicted_final_grade"])


def test_predict_curso_ajeno_403(client, doc2):
    res = client.post(f"{API}/ml/predict", headers=doc2, json={"student_id": "STU-001", "course_section_id": "CS-2026-001"})
    assert res.status_code == 403


def test_predict_estudiante_inexistente_404(client, doc1):
    res = client.post(f"{API}/ml/predict", headers=doc1, json={"student_id": "STU-404", "course_section_id": "CS-2026-001"})
    assert res.status_code == 404


def test_predict_sin_notas_409(client, doc1):
    # Se borran todas las notas de STU-005 en CS-2026-001
    for b, k in [(1, 1), (1, 2), (1, 3), (2, 1), (2, 2)]:
        client.delete(f"{API}/activities/ACT-2026-001-B{b}-{k}/grades/STU-005", headers=doc1)
    res = client.post(f"{API}/ml/predict", headers=doc1, json={"student_id": "STU-005", "course_section_id": "CS-2026-001"})
    assert res.status_code == 409


def test_predict_requiere_autenticacion(client):
    res = client.post(f"{API}/ml/predict", json={"student_id": "STU-001", "course_section_id": "CS-2026-001"})
    assert res.status_code == 401


def test_groups_sin_duplicados_y_equilibrados(client, doc1):
    res = client.post(f"{API}/ml/groups", headers=doc1, json={"course_section_id": "CS-2026-001", "n_groups": 4})
    assert res.status_code == 200
    body = res.json()
    groups = body["groups"]
    assert [g["group_number"] for g in groups] == [1, 2, 3, 4]
    all_ids = [sid for g in groups for sid in g["student_ids"]]
    assert len(all_ids) == len(set(all_ids)) == 20
    sizes = [len(g["student_ids"]) for g in groups]
    assert max(sizes) - min(sizes) <= 1


def test_groups_tamano_desigual(client, doc1):
    body = client.post(f"{API}/ml/groups", headers=doc1, json={"course_section_id": "CS-2026-001", "n_groups": 3}).json()
    sizes = sorted(len(g["student_ids"]) for g in body["groups"])
    assert sizes == [6, 7, 7]


@pytest.mark.parametrize("n_groups", [0, 21, -1])
def test_groups_cantidad_invalida_422(client, doc1, n_groups):
    res = client.post(f"{API}/ml/groups", headers=doc1, json={"course_section_id": "CS-2026-001", "n_groups": n_groups})
    assert res.status_code == 422


def test_groups_curso_ajeno_403(client, doc2):
    res = client.post(f"{API}/ml/groups", headers=doc2, json={"course_section_id": "CS-2026-001", "n_groups": 4})
    assert res.status_code == 403


# ---------- Adaptador del módulo ML (Samuel) ----------

def test_umbrales_de_riesgo():
    assert risk_from_grade(10.99) == "alto"
    assert risk_from_grade(11) == "moderado"
    assert risk_from_grade(13.99) == "moderado"
    assert risk_from_grade(14) == "bajo"


@pytest.mark.parametrize(
    "raw,expected",
    [("Alto", "alto"), ("medium", "moderado"), (["bajo"], "bajo"), ({"risk_level": "alto"}, "alto"), (1, "moderado")],
)
def test_normalizar_riesgo(raw, expected):
    assert normalize_risk(raw) == expected


def test_normalizar_grupos_varios_formatos():
    expected = [["A", "B"], ["C", "D"]]
    assert normalize_groups([["A", "B"], ["C", "D"]]) == expected
    assert normalize_groups({"groups": [{"group_number": 2, "student_ids": ["C", "D"]},
                                        {"group_number": 1, "student_ids": ["A", "B"]}]}) == expected
    assert normalize_groups({1: ["A", "B"], 2: ["C", "D"]}) == expected
    assert normalize_groups([{"student_id": "A", "group": 0}, {"student_id": "C", "group": 1},
                             {"student_id": "B", "group": 0}, {"student_id": "D", "group": 1}]) == expected


def _fake_adapter(**functions):
    adapter = MLAdapter()
    adapter._loaded = True
    adapter.functions = functions
    return adapter


def test_adaptador_usa_funciones_reales_si_existen():
    adapter = _fake_adapter(predict_final_grade=lambda f: 9.4, predict_risk=lambda f: "alto")
    assert adapter.mode == "model"
    grade, risk, version = adapter.predict(FEATURES)
    assert (grade, risk) == (9.4, "alto")
    assert version != ml_service.MOCK_MODEL_VERSION


def test_adaptador_recibe_las_variables_acordadas():
    received = {}

    def predict_final_grade(features):
        received.update(features)
        return 15

    adapter = _fake_adapter(predict_final_grade=predict_final_grade, predict_risk=lambda f: "bajo")
    adapter.predict(FEATURES)
    assert received == FEATURES


def test_adaptador_vuelve_a_simulado_si_el_modelo_falla():
    def broken(_):
        raise RuntimeError("modelo no cargado")

    adapter = _fake_adapter(predict_final_grade=broken, predict_risk=broken)
    grade, risk, version = adapter.predict(FEATURES)
    assert version == ml_service.MOCK_MODEL_VERSION
    assert risk == risk_from_grade(grade)


def test_adaptador_rechaza_grupos_con_duplicados():
    students = [{"student_id": s, **FEATURES} for s in ("A", "B", "C", "D")]
    adapter = _fake_adapter(generate_groups=lambda st, n: [["A", "B"], ["B", "C"]])
    groups, version = adapter.groups(students, 2)
    assert version == ml_service.MOCK_MODEL_VERSION  # resultado inválido -> respaldo
    assert sorted(sid for g in groups for sid in g) == ["A", "B", "C", "D"]


def test_adaptador_acepta_grupos_validos_del_modelo():
    students = [{"student_id": s, **FEATURES} for s in ("A", "B", "C", "D")]
    adapter = _fake_adapter(generate_groups=lambda st, n: [["A", "D"], ["B", "C"]])
    groups, version = adapter.groups(students, 2)
    assert groups == [["A", "D"], ["B", "C"]]
    assert version != ml_service.MOCK_MODEL_VERSION
