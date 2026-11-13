import pytest
from ml.inference import generate_groups, predict_final_grade, predict_risk
from ml.synthetic_data import FEATURE_NAMES, generate


def sample():
    return {"grade_bimester_1": 13, "grade_bimester_2": 14,
            "attendance_pct": 85, "homework_pct": 80,
            "participation_pct": 70, "previous_average": 13.5}


def test_dataset_sizes_and_no_2026_labels():
    historic, current = generate()
    assert len(historic) == 360 and len(current) == 80
    assert all(x["final_grade"] == "" for x in current)
    assert all(0 <= float(x["final_grade"]) <= 20 for x in historic)


def test_predictions():
    assert 0 <= predict_final_grade(sample()) <= 20
    assert predict_risk(sample()) in {"alto", "moderado", "bajo"}


def test_feature_validation():
    with pytest.raises(ValueError):
        predict_final_grade({"grade_bimester_1": 13})


def test_group_balance_and_uniqueness():
    students = [{"student_id": f"STU-{i:03d}", **sample(), "previous_average": float(i % 20)} for i in range(1, 21)]
    groups = generate_groups(students, 3)
    assert len(groups) == 3
    assert sorted(map(len, groups)) == [6, 7, 7]
    assert sorted(s for group in groups for s in group) == sorted(s["student_id"] for s in students)


def test_duplicate_students_rejected():
    with pytest.raises(ValueError):
        generate_groups([{"student_id": "X", **sample()}, {"student_id": "X", **sample()}], 2)
