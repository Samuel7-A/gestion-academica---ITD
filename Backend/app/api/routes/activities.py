import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession, ensure_enrolled, get_course_section_for_user
from app.models import Activity, Grade, utcnow
from app.schemas import GradeOut, GradeUpdate

router = APIRouter(prefix="/activities", tags=["Notas"])


def _get_activity(db: DbSession, user: CurrentUser, activity_id: str) -> Activity:
    activity = db.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Actividad no encontrada")
    get_course_section_for_user(db, user, activity.course_section_id)
    return activity


def _find_grade(db: DbSession, activity_id: str, student_id: str) -> Grade | None:
    return db.scalar(select(Grade).where(Grade.activity_id == activity_id, Grade.student_id == student_id))


@router.put(
    "/{activity_id}/grades/{student_id}",
    response_model=GradeOut,
    summary="Guardar o actualizar una nota (autoguardado)",
)
def upsert_grade(activity_id: str, student_id: str, body: GradeUpdate, user: CurrentUser, db: DbSession):
    activity = _get_activity(db, user, activity_id)
    ensure_enrolled(db, student_id, activity.course_section_id)

    grade = _find_grade(db, activity_id, student_id)
    if grade is None:
        grade = Grade(
            id=f"GRD-{uuid.uuid4().hex[:12].upper()}",
            activity_id=activity_id,
            student_id=student_id,
            value=body.value,
            updated_at=utcnow(),
        )
        db.add(grade)
        try:
            db.commit()
            return grade
        except IntegrityError:
            # Otra petición creó la nota al mismo tiempo: se actualiza la existente.
            db.rollback()
            grade = _find_grade(db, activity_id, student_id)
            if grade is None:
                raise
    grade.value = body.value
    grade.updated_at = utcnow()
    db.commit()
    return grade


@router.delete(
    "/{activity_id}/grades/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar una nota (cuando el docente vacía la celda)",
)
def delete_grade(activity_id: str, student_id: str, user: CurrentUser, db: DbSession) -> Response:
    activity = _get_activity(db, user, activity_id)
    ensure_enrolled(db, student_id, activity.course_section_id)
    grade = _find_grade(db, activity_id, student_id)
    if grade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nota no encontrada")
    db.delete(grade)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
