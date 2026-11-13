"""Contrato público de inferencia del backend de César.

predict_risk(dict[str, float]) -> 'alto'|'moderado'|'bajo'
predict_final_grade(dict[str, float]) -> float
generate_groups(list[{'student_id': ..., **features}], n_groups) -> list[list[str]]
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .synthetic_data import BASE_DIR, FEATURE_NAMES


def _features(features: dict) -> np.ndarray:
    missing = [name for name in FEATURE_NAMES if name not in features or features[name] is None]
    if missing:
        raise ValueError(f"Faltan variables académicas: {missing}")
    x = np.asarray([[float(features[key]) for key in FEATURE_NAMES]], dtype=float)
    if not np.isfinite(x).all():
        raise ValueError("Las variables deben ser números finitos")
    if not (0 <= x[0, 0] <= 20 and 0 <= x[0, 1] <= 20 and 0 <= x[0, 5] <= 20):
        raise ValueError("Las notas deben estar entre 0 y 20")
    if not np.logical_and(x[0, 2:5] >= 0, x[0, 2:5] <= 100).all():
        raise ValueError("Los porcentajes deben estar entre 0 y 100")
    return x


@lru_cache(maxsize=1)
def _models():
    grade_file = BASE_DIR / "artifacts" / "linear_regression.joblib"
    risk_file = BASE_DIR / "artifacts" / "decision_tree.joblib"
    if not (grade_file.is_file() and risk_file.is_file()):
        raise FileNotFoundError("Faltan modelos entrenados. Ejecutar: python -m ml.train desde Backend/")
    # Solo cargar archivos joblib generados por nuestro propio entrenamiento.
    return joblib.load(grade_file), joblib.load(risk_file)


def predict_final_grade(features: dict[str, float]) -> float:
    reg, _ = _models()
    prediction = reg.predict(_features(features))[0]
    return round(float(np.clip(prediction, 0, 20)), 2)


def predict_risk(features: dict[str, float]) -> str:
    _, classifier = _models()
    return str(classifier.predict(_features(features))[0])


def generate_groups(students: list[dict], n_groups: int) -> list[list[str]]:
    """K-Means descubre perfiles; reparto posterior equilibra tamaños y perfiles.

    No es una función destinada a tomar decisiones educativas reales.
    """
    if not isinstance(n_groups, int) or isinstance(n_groups, bool) or not 1 <= n_groups <= len(students):
        raise ValueError("n_groups debe estar entre 1 y la cantidad de estudiantes")
    ids = [str(s["student_id"]) for s in students]
    if len(ids) != len(set(ids)):
        raise ValueError("Hay identificadores de estudiantes duplicados")
    x = np.vstack([_features(s)[0] for s in students])
    labels = KMeans(n_clusters=min(3, len(students)), n_init=10, random_state=42).fit_predict(StandardScaler().fit_transform(x))
    # Con las prioridades de tamaño siempre se mantiene una diferencia máxima de 1.
    groups: list[list[str]] = [[] for _ in range(n_groups)]
    per_cluster = [[0 for _ in range(3)] for _ in range(n_groups)]
    for cluster in sorted(set(labels)):
        members = sorted((i for i, c in enumerate(labels) if c == cluster),
                         key=lambda i: (-float(np.mean(x[i, :2])), ids[i]))
        for idx in members:
            group = min(range(n_groups), key=lambda g: (len(groups[g]), per_cluster[g][cluster], g))
            groups[group].append(ids[idx])
            per_cluster[group][cluster] += 1
    return groups
