"""Comprueba trazabilidad y reproducción de métricas ML SINTÉTICAS."""
import json
from pathlib import Path

import pytest

from ml.train import train_models
from ml.synthetic_data import FEATURE_NAMES, generate

METRICS_PATH = Path(__file__).resolve().parents[1] / 'artifacts' / 'metrics.json'


def test_metrics_are_reproducible_without_overwriting_models():
    saved = json.loads(METRICS_PATH.read_text(encoding='utf-8'))
    recalculated = train_models(write_files=False)
    assert saved['features'] == list(FEATURE_NAMES)
    assert saved['training_records_2023_2024'] == 240
    assert saved['test_records_2025'] == 120
    assert saved['unlabeled_current_records_2026'] == 80
    assert recalculated['regression']['mae'] == pytest.approx(saved['regression']['mae'], abs=0.0001)
    assert recalculated['regression']['rmse'] == pytest.approx(saved['regression']['rmse'], abs=0.0001)
    assert recalculated['classification']['accuracy'] == pytest.approx(saved['classification']['accuracy'], abs=0.0001)
    assert recalculated['classification']['f1_macro'] == pytest.approx(saved['classification']['f1_macro'], abs=0.0001)
    assert recalculated['classification']['confusion_matrix'] == saved['classification']['confusion_matrix']


def test_confusion_matrix_matches_test_set_and_accuracy():
    saved = json.loads(METRICS_PATH.read_text(encoding='utf-8'))
    matrix = saved['classification']['confusion_matrix']
    n = sum(map(sum, matrix))
    assert n == saved['test_records_2025']
    correct = sum(matrix[i][i] for i in range(len(matrix)))
    assert correct / n == pytest.approx(saved['classification']['accuracy'], abs=0.0001)
    assert saved['classification']['labels'] == ['alto', 'moderado', 'bajo']


def test_2026_does_not_have_future_target_values():
    historic, current = generate(seed=20261113)
    assert len(historic) == 360
    assert len(current) == 80
    assert {r['year'] for r in historic} == {2023, 2024, 2025}
    assert {r['year'] for r in current} == {2026}
    assert all(r['final_grade'] == '' and r['risk_level'] == '' for r in current)
