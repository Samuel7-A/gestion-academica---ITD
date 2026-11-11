import uuid

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_course_section_for_user, is_admin
from app.models import Activity, CourseSection, Grade, Section
from app.schemas import (
    ActivityCreate,
    ActivityOut,
    CourseSectionOut,
    GradebookGrade,
    GradebookOut,
    GradebookStudent,
    StudentOut,
)
from app.services.academic import (
    bimester_averages,
    course_section_out,
    current_average,
    enrolled_students,
    student_counts,
    to_bimester_model,
)

router = APIRouter(prefix="/course-sections", tags=["Gestión académica"])


def _activities(db: DbSession, course_section_id: str) -> list[Activity]:
    return list(
        db.scalars(
            select(Activity)
            .where(Activity.course_section_id == course_section_id)
            .order_by(Activity.bimester, Activity.id)
        )
    )


@router.get("", response_model=list[CourseSectionOut], summary="Cursos y secciones del docente")
def list_course_sections(user: CurrentUser, db: DbSession) -> list[CourseSectionOut]:
    query = select(CourseSection).join(Section).order_by(Section.year.desc(), CourseSection.id)
    if not is_admin(user):
        query = query.where(CourseSection.teacher_id == user.id)
    sections = list(db.scalars(query))
    counts = student_counts(db, [cs.id for cs in sections])
    return [course_section_out(cs, counts.get(cs.id, 0)) for cs in sections]


@router.get("/{course_section_id}/students", response_model=list[StudentOut], summary="Estudiantes matriculados")
def list_students(course_section_id: str, user: CurrentUser, db: DbSession):
    get_course_section_for_user(db, user, course_section_id)
    return enrolled_students(db, course_section_id)


@router.get("/{course_section_id}/activities", response_model=list[ActivityOut], summary="Actividades")
def list_activities(course_section_id: str, user: CurrentUser, db: DbSession):
    get_course_section_for_user(db, user, course_section_id)
    return _activities(db, course_section_id)


@router.post(
    "/{course_section_id}/activities",
    response_model=ActivityOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una actividad",
)
def create_activity(course_section_id: str, body: ActivityCreate, user: CurrentUser, db: DbSession):
    get_course_section_for_user(db, user, course_section_id)
    activity = Activity(
        id=f"ACT-{uuid.uuid4().hex[:10].upper()}",
        course_section_id=course_section_id,
        bimester=body.bimester,
        title=body.title,
    )
    db.add(activity)
    db.commit()
    return activity


@router.get(
    "/{course_section_id}/gradebook",
    response_model=GradebookOut,
    summary="Registro de notas (estudiantes × actividades, con promedios por bimestre)",
)
def gradebook(course_section_id: str, user: CurrentUser, db: DbSession) -> GradebookOut:
    cs = get_course_section_for_user(db, user, course_section_id)
    activities = _activities(db, course_section_id)
    students = enrolled_students(db, course_section_id)

    grades_by_student: dict[str, list[GradebookGrade]] = {}
    rows = db.execute(
        select(Grade.student_id, Grade.activity_id, Grade.value, Grade.updated_at)
        .join(Activity, Activity.id == Grade.activity_id)
        .where(Activity.course_section_id == course_section_id)
        .order_by(Activity.bimester, Activity.id)
    )
    for student_id, activity_id, value, updated_at in rows:
        grades_by_student.setdefault(student_id, []).append(
            GradebookGrade(activity_id=activity_id, value=value, updated_at=updated_at)
        )

    averages = bimester_averages(db, [course_section_id])
    return GradebookOut(
        course_section=course_section_out(cs, len(students)),
        activities=[ActivityOut.model_validate(a) for a in activities],
        students=[
            GradebookStudent(
                student_id=s.id,
                code=s.code,
                full_name=s.full_name,
                grades=grades_by_student.get(s.id, []),
                bimester_averages=to_bimester_model(averages.get((course_section_id, s.id), {})),
                current_average=current_average(averages.get((course_section_id, s.id), {})),
            )
            for s in students
        ],
    )
