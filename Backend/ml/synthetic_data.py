"""Generación reproducible de datos ACADÉMICOS FICTICIOS, nunca datos reales.

Las observaciones 2023-2025 incluyen una nota final sintética generada
independientemente de las variables de inferencia; 2026 es parcial y no la tiene.
"""
from __future__ import annotations

import csv
from pathlib import Path
import numpy as np

FEATURE_NAMES = (
    "grade_bimester_1", "grade_bimester_2", "attendance_pct",
    "homework_pct", "participation_pct", "previous_average",
)
COURSES = ("CRS-MAT", "CRS-COM", "CRS-CYT", "CRS-CCSS")
RISK_LABELS = ("alto", "moderado", "bajo")
BASE_DIR = Path(__file__).resolve().parent


def _clip(x: float, low: float, high: float) -> float:
    return round(float(np.clip(x, low, high)), 2)


def _row(rng: np.random.Generator, student_id: str, course: str, year: int,
         ability: float, current: bool = False) -> dict[str, object]:
    course_effect = {"CRS-MAT": -0.5, "CRS-COM": 0.3, "CRS-CYT": -0.2, "CRS-CCSS": 0.2}[course]
    base = ability + course_effect + rng.normal(0, 0.8)
    g1 = _clip(base + rng.normal(0, 2.0), 0, 20)
    g2 = _clip(base + rng.normal(0, 2.0) + 0.15, 0, 20)
    attendance = _clip(72 + 2.0 * (ability - 10) + rng.normal(0, 8), 40, 100)
    homework = _clip(65 + 2.8 * (ability - 10) + rng.normal(0, 11), 20, 100)
    participation = _clip(60 + 2.3 * (ability - 10) + rng.normal(0, 14), 10, 100)
    previous = _clip(ability + rng.normal(0, 2.0), 0, 20)
    row = {"student_id": student_id, "course_id": course, "year": year,
           "grade_bimester_1": g1, "grade_bimester_2": g2,
           "attendance_pct": attendance, "homework_pct": homework,
           "participation_pct": participation, "previous_average": previous}
    if current:
        row["final_grade"] = ""
        row["risk_level"] = ""
    else:
        # Los bimestres futuros no son entrada del modelo; se simulan por separado.
        g3 = _clip(base + rng.normal(0, 1.7) + 0.1 * (g2 - g1), 0, 20)
        g4 = _clip(base + rng.normal(0, 1.7) + 0.2 * (g2 - g1), 0, 20)
        final = round((g1 + g2 + g3 + g4) / 4, 2)
        row["final_grade"] = final
        row["risk_level"] = "alto" if final < 11 else ("moderado" if final < 14 else "bajo")
    return row


def generate(seed: int = 20261113) -> tuple[list[dict], list[dict]]:
    rng = np.random.default_rng(seed)
    records: list[dict] = []
    # 30 perfiles x 4 cursos x 3 años = 360 registros históricos
    for i in range(1, 31):
        ability = float(np.clip(rng.normal(13, 4.0), 5, 19))
        for year in (2023, 2024, 2025):
            for course in COURSES:
                records.append(_row(rng, f"STU-{i:03d}", course, year, ability + rng.normal(0, 0.7)))
    current: list[dict] = []
    # 20 estudiantes x 4 cursos = 80 registros parciales
    for i in range(1, 21):
        ability = float(np.clip(rng.normal(13, 4.0), 5, 19))
        for course in COURSES:
            current.append(_row(rng, f"STU-{i:03d}", course, 2026, ability, current=True))
    return records, current


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["student_id", "course_id", "year", *FEATURE_NAMES, "final_grade", "risk_level"])
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    hist, current = generate()
    write_csv(hist, BASE_DIR / "data" / "historical_synthetic.csv")
    write_csv(current, BASE_DIR / "data" / "current_2026_synthetic.csv")
    print(f"Generados {len(hist)} registros históricos y {len(current)} parciales (SINTÉTICOS)")
