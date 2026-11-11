"""Datos sintéticos de demostración (NO son datos reales de estudiantes).

Permite probar la API sin esperar el dataset de ML. Crea:
- 1 administrador y 2 docentes.
- 4 cursos: Matemática, Comunicación, Ciencia y Tecnología, Ciencias Sociales.
- 2025 (histórico): 2do Secundaria A, 4 bimestres completos y nota final anual.
- 2026 (demostración): 3ro Secundaria A, solo bimestres 1 y 2, sin nota final.
- 20 estudiantes matriculados en los 4 cursos de ambos años (80 registros por año).

Uso:
    python -m app.db.seed           # carga solo si la base está vacía
    python -m app.db.seed --reset   # borra todo y vuelve a cargar
"""

import argparse
import random
from statistics import mean

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    AcademicIndicator,
    Activity,
    AnnualResult,
    Course,
    CourseSection,
    Enrollment,
    Grade,
    Section,
    Student,
    User,
    utcnow,
)

DEMO_PASSWORD = "Docente123!"
ADMIN_PASSWORD = "Admin123!"

USERS = [
    ("USR-ADMIN", "admin@demo.edu.pe", "admin", "Administrador Demo", ADMIN_PASSWORD),
    ("USR-DOC-001", "docente1@demo.edu.pe", "teacher", "Lucía Ramos Vega", DEMO_PASSWORD),
    ("USR-DOC-002", "docente2@demo.edu.pe", "teacher", "Jorge Medina Salas", DEMO_PASSWORD),
]

COURSES = [
    ("CRS-MAT", "Matemática", "USR-DOC-001"),
    ("CRS-COM", "Comunicación", "USR-DOC-001"),
    ("CRS-CYT", "Ciencia y Tecnología", "USR-DOC-002"),
    ("CRS-CCSS", "Ciencias Sociales", "USR-DOC-002"),
]

SECTIONS = [
    ("SEC-2025-2A", 2025, "2do Secundaria", "A"),
    ("SEC-2026-3A", 2026, "3ro Secundaria", "A"),
]

FIRST_NAMES = [
    "Valeria", "Mateo", "Camila", "Santiago", "Luciana", "Sebastián", "Ximena", "Diego", "Mariana", "Thiago",
    "Fernanda", "Adrián", "Daniela", "Gael", "Renata", "Joaquín", "Antonella", "Leonardo", "Isabella", "Emilio",
]
LAST_NAMES = [
    "Quispe", "Flores", "Huamán", "Rojas", "Mendoza", "Castillo", "Vargas", "Chávez", "Torres", "Ramírez",
    "Gutiérrez", "Paredes", "Salazar", "Cárdenas", "Navarro", "Espinoza", "Ríos", "Delgado", "Pizarro", "Aguilar",
]
ACTIVITY_TITLES = ["Práctica calificada", "Tarea", "Evaluación bimestral"]
N_STUDENTS = 20

# Orden de borrado respetando las claves foráneas.
_TABLES_IN_DELETE_ORDER = [
    Grade, AnnualResult, AcademicIndicator, Activity, Enrollment, CourseSection, Section, Course, Student, User,
]


def _clip(value: float, low: float, high: float) -> float:
    return round(min(max(value, low), high), 1)


def reset_data(db: Session) -> None:
    for model in _TABLES_IN_DELETE_ORDER:
        db.execute(delete(model))
    db.commit()


def seed_demo_data(db: Session, reset: bool = False) -> bool:
    """Carga los datos. Devuelve False si ya existían y no se pidió reset."""
    if reset:
        reset_data(db)
    elif db.get(User, "USR-ADMIN") is not None:
        return False

    rng = random.Random(2026)

    for uid, email, role, name, password in USERS:
        db.add(User(id=uid, email=email, role=role, full_name=name, password_hash=hash_password(password)))
    for cid, name, _ in COURSES:
        db.add(Course(id=cid, name=name))
    for sid, year, grade_level, section_name in SECTIONS:
        db.add(Section(id=sid, year=year, grade_level=grade_level, section_name=section_name))

    students = []
    for n in range(1, N_STUDENTS + 1):
        full_name = f"{FIRST_NAMES[n - 1]} {LAST_NAMES[n - 1]} {LAST_NAMES[(n * 7) % N_STUDENTS]}"
        students.append(Student(id=f"STU-{n:03d}", code=f"JC-{n:04d}", full_name=full_name))
    db.add_all(students)
    db.flush()

    # Habilidad latente por estudiante: genera notas coherentes entre cursos y años.
    ability = {s.id: _clip(rng.gauss(13.5, 2.8), 6, 19) for s in students}
    course_offset = {cid: rng.uniform(-0.8, 0.8) for cid, _, _ in COURSES}

    final_2025: dict[tuple[str, str], float] = {}  # (student_id, course_id) -> nota final 2025

    for year, section_id, n_bimesters in ((2025, "SEC-2025-2A", 4), (2026, "SEC-2026-3A", 2)):
        for idx, (course_id, _, teacher_id) in enumerate(COURSES, start=1):
            cs_id = f"CS-{year}-{idx:03d}"
            db.add(CourseSection(id=cs_id, course_id=course_id, section_id=section_id, teacher_id=teacher_id))
            db.flush()

            activities = []
            for b in range(1, n_bimesters + 1):
                for k, title in enumerate(ACTIVITY_TITLES, start=1):
                    activities.append(
                        Activity(id=f"ACT-{cs_id[3:]}-B{b}-{k}", course_section_id=cs_id, bimester=b, title=f"{title} {b}")
                    )
            db.add_all(activities)

            for s in students:
                db.add(Enrollment(id=f"ENR-{cs_id[3:]}-{s.id[4:]}", student_id=s.id, course_section_id=cs_id))
                base = ability[s.id] + course_offset[course_id] + (0.3 if year == 2026 else 0)
                trend = rng.uniform(-0.6, 0.6)

                bimester_scores: dict[int, list[float]] = {}
                for act in activities:
                    # En 2026 la evaluación del bimestre 2 aún no se toma: queda vacía para la demo.
                    if year == 2026 and act.bimester == 2 and act.id.endswith("-3"):
                        continue
                    value = _clip(base + trend * (act.bimester - 1) + rng.gauss(0, 1.5), 0, 20)
                    db.add(
                        Grade(
                            id=f"GRD-{act.id[4:]}-{s.id[4:]}",
                            activity_id=act.id,
                            student_id=s.id,
                            value=value,
                            updated_at=utcnow(),
                        )
                    )
                    bimester_scores.setdefault(act.bimester, []).append(value)

                commitment = (ability[s.id] - 6) / 13  # 0..1
                previous = final_2025.get((s.id, course_id))
                if previous is None:  # 2025 no tiene año previo cargado: se simula.
                    previous = _clip(base + rng.gauss(0, 1.2), 0, 20)
                db.add(
                    AcademicIndicator(
                        student_id=s.id,
                        course_section_id=cs_id,
                        attendance_pct=_clip(75 + 22 * commitment + rng.gauss(0, 4), 50, 100),
                        homework_pct=_clip(55 + 42 * commitment + rng.gauss(0, 8), 20, 100),
                        participation_pct=_clip(45 + 50 * commitment + rng.gauss(0, 10), 10, 100),
                        previous_average=previous,
                    )
                )

                if year == 2025:  # Solo los años completados tienen nota final.
                    final = round(mean(mean(v) for v in bimester_scores.values()), 2)
                    final_2025[(s.id, course_id)] = final
                    db.add(AnnualResult(student_id=s.id, course_section_id=cs_id, final_grade=final))
            db.flush()

    db.commit()
    return True


def main() -> None:
    from app.db.session import SessionLocal

    parser = argparse.ArgumentParser(description="Carga datos sintéticos de demostración")
    parser.add_argument("--reset", action="store_true", help="Borra todos los datos antes de cargar")
    args = parser.parse_args()
    with SessionLocal() as db:
        loaded = seed_demo_data(db, reset=args.reset)
    print("Datos de demostración cargados." if loaded else "Ya existían datos; no se cargó nada (usa --reset).")


if __name__ == "__main__":
    main()
