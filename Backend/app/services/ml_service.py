"""Integración con el módulo de Machine Learning de Samuel (Backend/ml/).

El backend arma las variables académicas desde la base de datos y llama a:
    predict_risk(features)            -> "bajo" | "moderado" | "alto"
    predict_final_grade(features)     -> float (0 a 20)
    generate_groups(students, n_groups) -> grupos de student_ids

`features` es un dict con las 6 variables acordadas (ver FEATURE_NAMES).
`students` es una lista de dicts: {"student_id": "STU-001", **features}.

Mientras esas funciones no existan (o si fallan), se usan respuestas simuladas
con el mismo formato JSON y model_version = MOCK_MODEL_VERSION.
"""

from __future__ import annotations

import importlib
import logging
from collections.abc import Callable, Iterable
from statistics import mean
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AcademicIndicator
from app.services.academic import bimester_averages, enrolled_students

logger = logging.getLogger(__name__)

FEATURE_NAMES = (
    "grade_bimester_1",
    "grade_bimester_2",
    "attendance_pct",
    "homework_pct",
    "participation_pct",
    "previous_average",
)
MOCK_MODEL_VERSION = "mock-v0"
DEFAULT_ML_MODULES = ("ml", "ml.inference", "ml.predict", "ml.src.inference")
_FUNCTION_NAMES = ("predict_risk", "predict_final_grade", "generate_groups")

# Criterios internos del dataset sintético (no son criterios oficiales de la institución).
HIGH_RISK_BELOW = 11.0
MODERATE_RISK_BELOW = 14.0


class InsufficientDataError(Exception):
    """Faltan datos académicos para ejecutar la predicción."""


# ---------- Variables de predicción ----------

def _compose_features(
    averages: dict[int, float], indicator: AcademicIndicator | None
) -> dict[str, float | None]:
    b1, b2 = averages.get(1), averages.get(2)
    # Si solo hay un bimestre con notas, se usa el mismo valor para ambos.
    b1 = b1 if b1 is not None else b2
    b2 = b2 if b2 is not None else b1
    previous = indicator.previous_average if indicator else None
    if previous is None and b1 is not None:
        previous = round((b1 + b2) / 2, 2)
    return {
        "grade_bimester_1": b1,
        "grade_bimester_2": b2,
        "attendance_pct": indicator.attendance_pct if indicator else None,
        "homework_pct": indicator.homework_pct if indicator else None,
        "participation_pct": indicator.participation_pct if indicator else None,
        "previous_average": previous,
    }


def build_features(db: Session, student_id: str, course_section_id: str) -> dict[str, float]:
    averages = bimester_averages(db, [course_section_id], student_id).get(
        (course_section_id, student_id), {}
    )
    indicator = db.get(AcademicIndicator, (student_id, course_section_id))
    features = _compose_features(averages, indicator)

    if features["grade_bimester_1"] is None:
        raise InsufficientDataError("El estudiante aún no tiene notas en los bimestres 1 y 2")
    if indicator is None:
        raise InsufficientDataError(
            "No hay indicadores académicos (asistencia, tareas, participación) para este estudiante"
        )
    return {k: float(v) for k, v in features.items()}


def build_section_students(db: Session, course_section_id: str) -> list[dict[str, Any]]:
    """Variables de todos los matriculados. Los valores faltantes se completan con la media de la sección."""
    students = enrolled_students(db, course_section_id)
    averages = bimester_averages(db, [course_section_id])
    indicators = {
        ind.student_id: ind
        for ind in db.scalars(
            select(AcademicIndicator).where(AcademicIndicator.course_section_id == course_section_id)
        )
    }
    rows = [
        {"student_id": s.id, **_compose_features(averages.get((course_section_id, s.id), {}), indicators.get(s.id))}
        for s in students
    ]
    defaults = {"attendance_pct": 100.0, "homework_pct": 100.0, "participation_pct": 100.0}
    for name in FEATURE_NAMES:
        known = [r[name] for r in rows if r[name] is not None]
        fill = round(mean(known), 2) if known else defaults.get(name, HIGH_RISK_BELOW)
        for r in rows:
            if r[name] is None:
                r[name] = fill
            r[name] = float(r[name])
    return rows


# ---------- Respuestas simuladas ----------

def risk_from_grade(grade: float) -> str:
    if grade < HIGH_RISK_BELOW:
        return "alto"
    if grade < MODERATE_RISK_BELOW:
        return "moderado"
    return "bajo"


def mock_final_grade(f: dict[str, float]) -> float:
    """Heurística simple y transparente; NO es un modelo entrenado."""
    partial = (f["grade_bimester_1"] + f["grade_bimester_2"]) / 2
    commitment = (0.4 * f["attendance_pct"] + 0.4 * f["homework_pct"] + 0.2 * f["participation_pct"]) / 5
    grade = 0.6 * partial + 0.25 * f["previous_average"] + 0.15 * commitment
    return round(min(max(grade, 0.0), 20.0), 1)


def balanced_groups(students: list[dict[str, Any]], n_groups: int) -> list[list[str]]:
    """Reparto en serpiente según rendimiento: tamaños parejos y niveles mezclados."""
    ranked = sorted(students, key=lambda s: mock_final_grade(s), reverse=True)
    groups: list[list[str]] = [[] for _ in range(n_groups)]
    for i, student in enumerate(ranked):
        round_idx, pos = divmod(i, n_groups)
        idx = pos if round_idx % 2 == 0 else n_groups - 1 - pos
        groups[idx].append(student["student_id"])
    return groups


# ---------- Normalización de lo que devuelvan las funciones de ML ----------

def _first(value: Any) -> Any:
    if hasattr(value, "tolist"):  # numpy array / escalar
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        if not value:
            raise ValueError("Resultado vacío")
        return _first(value[0])
    return value


def normalize_grade(value: Any) -> float:
    if isinstance(value, dict):
        value = value.get("predicted_final_grade", value.get("final_grade"))
    grade = float(_first(value))
    return round(min(max(grade, 0.0), 20.0), 2)


_RISK_ALIASES = {
    "bajo": "bajo", "low": "bajo", "riesgo bajo": "bajo", "0": "bajo",
    "moderado": "moderado", "medio": "moderado", "medium": "moderado", "moderate": "moderado",
    "riesgo moderado": "moderado", "1": "moderado",
    "alto": "alto", "high": "alto", "riesgo alto": "alto", "2": "alto",
}


def normalize_risk(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("risk_level", value.get("risk"))
    key = str(_first(value)).strip().lower()
    if key not in _RISK_ALIASES:
        raise ValueError(f"Nivel de riesgo desconocido: {value!r}")
    return _RISK_ALIASES[key]


def normalize_groups(result: Any) -> list[list[str]]:
    if hasattr(result, "to_dict") and not isinstance(result, dict):  # DataFrame de pandas
        result = result.to_dict("records")
    if isinstance(result, dict):
        if "groups" in result:
            result = result["groups"]
        else:  # {numero_grupo: [ids]}
            return [[str(i) for i in ids] for _, ids in sorted(result.items(), key=lambda kv: kv[0])]
    if hasattr(result, "tolist"):
        result = result.tolist()
    result = list(result)
    if not result:
        return []

    first = result[0]
    if isinstance(first, dict) and ("student_ids" in first or "members" in first):
        ordered = sorted(result, key=lambda g: g.get("group_number", 0))
        return [[str(i) for i in g.get("student_ids", g.get("members", []))] for g in ordered]
    if isinstance(first, dict) and "student_id" in first:  # asignación fila por fila
        key = next((k for k in ("group_number", "group", "cluster") if k in first), None)
        if key is None:
            raise ValueError("Formato de grupos no reconocido")
        buckets: dict[Any, list[str]] = {}
        for row in result:
            buckets.setdefault(row[key], []).append(str(row["student_id"]))
        return [buckets[k] for k in sorted(buckets)]
    return [[str(i) for i in (g.tolist() if hasattr(g, "tolist") else g)] for g in result]


def validate_groups(groups: list[list[str]], expected_ids: Iterable[str], n_groups: int) -> None:
    flat = [sid for g in groups for sid in g]
    if len(flat) != len(set(flat)):
        raise ValueError("Hay estudiantes duplicados entre grupos")
    if set(flat) != set(expected_ids):
        raise ValueError("Los grupos no contienen exactamente a los estudiantes de la sección")
    if len(groups) != n_groups or any(not g for g in groups):
        raise ValueError("Cantidad de grupos incorrecta o grupos vacíos")


# ---------- Adaptador ----------

class MLAdapter:
    def __init__(self, module_name: str = "") -> None:
        self.module_name = module_name
        self.functions: dict[str, Callable[..., Any]] = {}
        self.loaded_from: dict[str, str] = {}
        self._loaded = False

    def _load(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        candidates = (self.module_name,) if self.module_name else DEFAULT_ML_MODULES
        for name in candidates:
            try:
                module = importlib.import_module(name)
            except ModuleNotFoundError as exc:
                if exc.name and not name.startswith(exc.name):
                    logger.warning("El módulo ML %s requiere una dependencia no instalada: %s", name, exc.name)
                continue
            except Exception:
                logger.exception("No se pudo importar el módulo ML %s", name)
                continue
            for fn_name in _FUNCTION_NAMES:
                fn = getattr(module, fn_name, None)
                if callable(fn) and fn_name not in self.functions:
                    self.functions[fn_name] = fn
                    self.loaded_from[fn_name] = name
        if self.functions:
            logger.info("Funciones ML cargadas: %s", self.loaded_from)
        else:
            logger.info("No se encontraron funciones ML; se usarán respuestas simuladas (%s)", MOCK_MODEL_VERSION)

    @property
    def mode(self) -> str:
        self._load()
        return "model" if {"predict_risk", "predict_final_grade"} <= self.functions.keys() else "mock"

    def predict(self, features: dict[str, float]) -> tuple[float, str, str]:
        """Devuelve (nota_final_proyectada, nivel_de_riesgo, model_version)."""
        if self.mode == "model":
            try:
                grade = normalize_grade(self.functions["predict_final_grade"](dict(features)))
                risk = normalize_risk(self.functions["predict_risk"](dict(features)))
                return grade, risk, settings.ml_model_version
            except Exception:
                logger.exception("Falló el modelo de predicción; se usa respuesta simulada")
        grade = mock_final_grade(features)
        return grade, risk_from_grade(grade), MOCK_MODEL_VERSION

    def groups(self, students: list[dict[str, Any]], n_groups: int) -> tuple[list[list[str]], str]:
        """Devuelve (lista de grupos de student_ids, model_version)."""
        self._load()
        expected = [s["student_id"] for s in students]
        fn = self.functions.get("generate_groups")
        if fn is not None:
            try:
                groups = normalize_groups(fn([dict(s) for s in students], n_groups))
                validate_groups(groups, expected, n_groups)
                return groups, settings.ml_model_version
            except Exception:
                logger.exception("Falló generate_groups; se usa agrupamiento simulado")
        return balanced_groups(students, n_groups), MOCK_MODEL_VERSION


ml_adapter = MLAdapter(settings.ml_module)
