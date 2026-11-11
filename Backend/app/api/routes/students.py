from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, is_admin
from app.models import AcademicIndicator, AnnualResult, CourseSection, Enrollment, Section, Student
from app.schemas import AcademicHistoryOut, AcademicHistoryRecord, StudentOut
from app.services.academic import bimester_averages, current_average, to_bimester_model

router = APIRouter(prefix="/students", tags=["Gestión académica"])


@router.get(
    "/{student_id}/academic-history",
    response_model=AcademicHistoryOut,
    summary="Historial académico del estudiante (todos los años)",
)
def academic_history(student_id: str, user: CurrentUser, db: DbSession) -> AcademicHistoryOut:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Estudiante no encontrado")

    if not is_admin(user):
        # El docente solo puede ver el historial de estudiantes matriculados en sus cursos.
        teaches_student = db.scalar(
            select(Enrollment.id)
            .join(CourseSection, CourseSection.id == Enrollment.course_section_id)
            .where(Enrollment.student_id == student_id, CourseSection.teacher_id == user.id)
            .limit(1)
        )
        if teaches_student is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a este estudiante")

    sections = list(
        db.scalars(
            select(CourseSection)
            .join(Enrollment, Enrollment.course_section_id == CourseSection.id)
            .join(Section, Section.id == CourseSection.section_id)
            .where(Enrollment.student_id == student_id)
            .order_by(Section.year.desc(), CourseSection.course_id)
        )
    )
    cs_ids = [cs.id for cs in sections]
    averages = bimester_averages(db, cs_ids, student_id)
    indicators = {
        i.course_section_id: i
        for i in db.scalars(
            select(AcademicIndicator).where(
                AcademicIndicator.student_id == student_id, AcademicIndicator.course_section_id.in_(cs_ids)
            )
        )
    }
    finals = {
        r.course_section_id: r.final_grade
        for r in db.scalars(
            select(AnnualResult).where(
                AnnualResult.student_id == student_id, AnnualResult.course_section_id.in_(cs_ids)
            )
        )
    }

    records = []
    for cs in sections:
        avg = averages.get((cs.id, student_id), {})
        ind = indicators.get(cs.id)
        records.append(
            AcademicHistoryRecord(
                course_section_id=cs.id,
                year=cs.section.year,
                course_id=cs.course_id,
                course_name=cs.course.name,
                grade_level=cs.section.grade_level,
                section_name=cs.section.section_name,
                bimester_averages=to_bimester_model(avg),
                current_average=current_average(avg),
                final_grade=finals.get(cs.id),
                attendance_pct=ind.attendance_pct if ind else None,
                homework_pct=ind.homework_pct if ind else None,
                participation_pct=ind.participation_pct if ind else None,
                previous_average=ind.previous_average if ind else None,
            )
        )
    return AcademicHistoryOut(student=StudentOut.model_validate(student), records=records)
