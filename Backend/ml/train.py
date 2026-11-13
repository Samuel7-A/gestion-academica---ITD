"""Entrena y evalúa únicamente con registros sintéticos.

Entrenamiento: 2023-2024 (con división interna); prueba final: 2025.
Jamás se utilizan datos de 2026 ni la columna objetivo como variables de entrada.
"""
from __future__ import annotations

import json
from pathlib import Path
import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             f1_score, mean_absolute_error, mean_squared_error)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from .synthetic_data import BASE_DIR, FEATURE_NAMES, RISK_LABELS, generate, write_csv


def _xy(rows: list[dict]):
    X = np.asarray([[float(row[col]) for col in FEATURE_NAMES] for row in rows], dtype=float)
    y_grade = np.asarray([float(row["final_grade"]) for row in rows], dtype=float)
    y_risk = np.asarray([str(row["risk_level"]) for row in rows], dtype=object)
    return X, y_grade, y_risk


def train_models(write_files: bool = True) -> dict:
    historic, current = generate()
    train = [r for r in historic if r["year"] < 2025]
    test = [r for r in historic if r["year"] == 2025]
    X_train, y_train_grade, y_train_risk = _xy(train)
    X_test, y_test_grade, y_test_risk = _xy(test)
    # Preprocesamiento dentro de cada pipeline, aprendido SOLO de entrenamiento.
    regression = Pipeline([("impute", SimpleImputer(strategy="median")),
                           ("scale", StandardScaler()), ("model", LinearRegression())])
    classification = Pipeline([("impute", SimpleImputer(strategy="median")),
                               ("model", DecisionTreeClassifier(max_depth=5, min_samples_leaf=8, random_state=42))])
    regression.fit(X_train, y_train_grade)
    classification.fit(X_train, y_train_risk)
    grade_pred = np.clip(regression.predict(X_test), 0, 20)
    risk_pred = classification.predict(X_test)
    metrics = {
        "warning": "Todas las observaciones son sintéticas; métricas NO validan su rendimiento real.",
        "seed": 20261113,
        "features": list(FEATURE_NAMES),
        "training_records_2023_2024": len(train),
        "test_records_2025": len(test),
        "unlabeled_current_records_2026": len(current),
        "regression": {
            "mae": round(float(mean_absolute_error(y_test_grade, grade_pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test_grade, grade_pred))), 4),
        },
        "classification": {
            "accuracy": round(float(accuracy_score(y_test_risk, risk_pred)), 4),
            "f1_macro": round(float(f1_score(y_test_risk, risk_pred, labels=list(RISK_LABELS), average="macro", zero_division=0)), 4),
            "labels": list(RISK_LABELS),
            "confusion_matrix": confusion_matrix(y_test_risk, risk_pred, labels=list(RISK_LABELS)).tolist(),
            "report": classification_report(y_test_risk, risk_pred, labels=list(RISK_LABELS), output_dict=True, zero_division=0),
        },
    }
    if write_files:
        output = BASE_DIR / "artifacts"
        output.mkdir(exist_ok=True)
        joblib.dump(regression, output / "linear_regression.joblib")
        joblib.dump(classification, output / "decision_tree.joblib")
        write_csv(historic, BASE_DIR / "data" / "historical_synthetic.csv")
        write_csv(current, BASE_DIR / "data" / "current_2026_synthetic.csv")
        (output / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    print(json.dumps(train_models(), indent=2, ensure_ascii=False))
