"""Consultas académicas reutilizables: promedios, libreta de notas, indicadores."""

from collections import defaultdict
from statistics import mean

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Activity, CourseSection, Enrollment, Grade, Student
from app.schemas import BimesterAverages, CourseSectionOut


def course_section_out(cs: CourseSection, student_count: int) -> CourseSectionOut:
    return CourseSectionOut(
        id=cs.id,
        course_id=cs.course_id,
        course_name=cs.course.name,
        section_id=cs.section_id,
        year=cs.section.year,
        grade_level=cs.section.grade_level,
        section_name=cs.section.section_name,
        teacher_id=cs.teacher_id,
        student_count=student_count,
    )


def student_counts(db: Session, course_section_ids: list[str]) -> dict[str, int]:
    if not course_section_ids:
        return {}
    rows = db.execute(
        select(Enrollment.course_section_id, func.count(Enrollment.id))
        .where(Enrollment.course_section_id.in_(course_section_ids))
        .group_by(Enrollment.course_section_id)
    ).all()
    return {cs_id: count for cs_id, count in rows}


def enrolled_students(db: Session, course_section_id: str) -> list[Student]:
    return list(
        db.scalars(
            select(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .where(Enrollment.course_section_id == course_section_id)
            .order_by(Student.full_name, Student.id)
        )
    )


def bimester_averages(
    db: Session, course_section_ids: list[str], student_id: str | None = None
) -> dict[tuple[str, str], dict[int, float]]:
    """Promedio por bimestre a partir de las notas de sus actividades.

    Devuelve {(course_section_id, student_id): {bimestre: promedio}}.
    Las actividades sin nota no cuentan en el promedio.
    """
    if not course_section_ids:
        return {}
    query = (
        select(Activity.course_section_id, Grade.student_id, Activity.bimester, func.avg(Grade.value))
        .join(Activity, Activity.id == Grade.activity_id)
        .where(Activity.course_section_id.in_(course_section_ids))
        .group_by(Activity.course_section_id, Grade.student_id, Activity.bimester)
    )
    if student_id is not None:
        query = query.where(Grade.student_id == student_id)

    result: dict[tuple[str, str], dict[int, float]] = defaultdict(dict)
    for cs_id, stu_id, bimester, avg in db.execute(query):
        result[(cs_id, stu_id)][bimester] = round(float(avg), 2)
    return result


def to_bimester_model(averages: dict[int, float]) -> BimesterAverages:
    return BimesterAverages(**{f"bimester_{b}": averages.get(b) for b in range(1, 5)})


def current_average(averages: dict[int, float]) -> float | None:
    """Promedio de los bimestres con notas (la nota anual es el promedio de los 4 bimestres)."""
    if not averages:
        return None
    return round(mean(averages.values()), 2)
