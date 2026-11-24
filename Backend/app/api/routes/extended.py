"""APF4: alta por invitación de un solo uso, programación de exámenes,
historial de reportes y readiness. Los datos son sintéticos para la demo.
"""
from __future__ import annotations

import hashlib
import re
import secrets
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession, get_course_section_for_user, is_admin
from app.core.security import hash_password
from app.models import Activity, CourseSection, User, utcnow
from app.models_extra import ExamSchedule, ReportHistory, TeacherInvite
from app.schemas import UserOut

auth_router = APIRouter(prefix="/auth", tags=["Autenticación / invitaciones"])
academic_router = APIRouter(prefix="/course-sections", tags=["Programación de exámenes"])
activities_router = APIRouter(prefix="/activities", tags=["Programación de exámenes"])
reports_router = APIRouter(prefix="/reports", tags=["Historial de reportes"])
health_router = APIRouter(tags=["Sistema"])
admin_router = APIRouter(prefix="/admin", tags=["Administración"])

_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def normalize_email(v: str) -> str:
    email = v.strip().lower()
    if len(email) > 255 or not _EMAIL.fullmatch(email):
        raise ValueError("Ingresa un correo electrónico válido")
    return email


def _aware(value: datetime) -> datetime:
    """SQLite devuelve datetime ingenuos; PostgreSQL conserva TZ."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def require_admin(user: User) -> None:
    if not is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el administrador puede invitar docentes")


class InviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    expires_hours: int = Field(default=24, ge=1, le=72)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class InviteCreated(BaseModel):
    email: str
    invite_token: str = Field(description="Mostrar una sola vez; entregar por canal privado")
    expires_at: datetime


class TeacherRegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=12, max_length=72)
    invite_token: str = Field(min_length=32, max_length=256)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar 72 bytes UTF-8")
        return value

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = " ".join(value.strip().split())
        if len(name) < 2:
            raise ValueError("Ingresa un nombre")
        return name


@auth_router.post("/invitations", response_model=InviteCreated, status_code=201,
                  summary="Administrador: crear invitación de un solo uso para un docente")
def create_invitation(body: InviteRequest, user: CurrentUser, db: DbSession) -> InviteCreated:
    require_admin(user)
    if db.scalar(select(User.id).where(User.email == body.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El correo ya está registrado")
    token = secrets.token_urlsafe(32)
    expire = utcnow() + timedelta(hours=body.expires_hours)
    db.add(TeacherInvite(id=f"INV-{uuid.uuid4().hex.upper()}", email=body.email,
                         token_hash=hashlib.sha256(token.encode()).hexdigest(),
                         created_by=user.id, expires_at=expire))
    db.commit()
    return InviteCreated(email=body.email, invite_token=token, expires_at=expire)


@auth_router.post("/register", response_model=UserOut, status_code=201,
                  summary="Registrar un docente mediante invitación válida de un solo uso")
def register_teacher(body: TeacherRegisterRequest, db: DbSession) -> UserOut:
    digest = hashlib.sha256(body.invite_token.encode()).hexdigest()
    invite = db.scalar(select(TeacherInvite).where(TeacherInvite.token_hash == digest).with_for_update())
    if not invite or invite.used_at or _aware(invite.expires_at) <= utcnow() or invite.email != body.email:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invitación inválida o vencida")
    if db.scalar(select(User.id).where(User.email == body.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El correo ya está registrado")
    user = User(id=f"USR-DOC-{uuid.uuid4().hex[:20].upper()}", email=body.email,
                role="teacher", full_name=body.full_name,
                password_hash=hash_password(body.password))
    db.add(user)
    invite.used_at = utcnow()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "No se pudo completar el registro") from None
    return UserOut.model_validate(user)


class AssignTeacherRequest(BaseModel):
    course_section_id: str = Field(min_length=1, max_length=50)
    teacher_id: str = Field(min_length=1, max_length=50)


@admin_router.post("/assign-course", summary="Administrador: asignar sección a un docente registrado")
def assign_teacher(body: AssignTeacherRequest, user: CurrentUser, db: DbSession):
    require_admin(user)
    teacher = db.get(User, body.teacher_id)
    if teacher is None or teacher.role != "teacher":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Docente no encontrado")
    section = db.get(CourseSection, body.course_section_id)
    if section is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso-sección no encontrado")
    section.teacher_id = teacher.id
    db.commit()
    return {"course_section_id": section.id, "teacher_id": teacher.id}


class ScheduleInput(BaseModel):
    schedule_date: date | None = None
    schedule_time: time | None = None
    room: str | None = Field(default=None, max_length=80)
    status: Literal["sin-fecha", "pendiente", "realizado", "cancelado"] = "sin-fecha"

    @model_validator(mode="after")
    def valid_schedule(self):
        if (self.schedule_date is None) != (self.schedule_time is None):
            raise ValueError("Fecha y hora deben indicarse juntas")
        if self.status != "sin-fecha" and self.schedule_date is None:
            raise ValueError("El estado requiere fecha y hora")
        if self.schedule_date is not None and self.status == "sin-fecha":
            self.status = "pendiente"
        if self.room is not None:
            self.room = self.room.strip() or None
        return self


class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    activity_id: str
    schedule_date: date | None
    schedule_time: time | None
    room: str | None
    status: str
    updated_at: datetime


def _owned_activity(activity_id: str, user: User, db: DbSession) -> Activity:
    activity = db.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Actividad no encontrada")
    get_course_section_for_user(db, user, activity.course_section_id)
    return activity


@academic_router.get("/{course_section_id}/exam-schedules", response_model=list[ScheduleOut],
                     summary="Consultar horarios de evaluación guardados en PostgreSQL")
def list_exam_schedules(course_section_id: str, user: CurrentUser, db: DbSession):
    get_course_section_for_user(db, user, course_section_id)
    schedules = db.scalars(select(ExamSchedule).join(Activity, Activity.id == ExamSchedule.activity_id)
                           .where(Activity.course_section_id == course_section_id)
                           .order_by(ExamSchedule.schedule_date, Activity.id))
    return list(schedules)


@activities_router.put("/{activity_id}/schedule", response_model=ScheduleOut,
                       summary="Crear o actualizar programación de examen")
def save_exam_schedule(activity_id: str, body: ScheduleInput, user: CurrentUser, db: DbSession):
    _owned_activity(activity_id, user, db)
    item = db.get(ExamSchedule, activity_id)
    if item is None:
        item = ExamSchedule(activity_id=activity_id)
        db.add(item)
    item.schedule_date = body.schedule_date
    item.schedule_time = body.schedule_time
    item.room = body.room
    item.status = body.status
    item.updated_at = utcnow()
    db.commit()
    return item


@activities_router.delete("/{activity_id}/schedule", status_code=204,
                          summary="Eliminar programación de examen")
def delete_exam_schedule(activity_id: str, user: CurrentUser, db: DbSession):
    _owned_activity(activity_id, user, db)
    item = db.get(ExamSchedule, activity_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No existe programación para esa actividad")
    db.delete(item)
    db.commit()
    return Response(status_code=204)


class ReportHistoryInput(BaseModel):
    course_section_id: str = Field(min_length=1, max_length=50)
    report_type: Literal["notas", "asistencia", "riesgo", "otro"]
    filename: str = Field(min_length=1, max_length=180)
    row_count: int = Field(ge=0, le=1000000)
    csv_content: str | None = Field(default=None, max_length=500000)

    @field_validator("filename")
    @classmethod
    def no_path(cls, v: str) -> str:
        clean = v.strip()
        if "/" in clean or "\\" in clean or not clean:
            raise ValueError("El nombre del archivo no puede contener rutas")
        return clean


class ReportHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    course_section_id: str
    report_type: str
    filename: str
    row_count: int
    created_at: datetime


@reports_router.post("", response_model=ReportHistoryOut, status_code=201,
                     summary="Guardar metadatos de un reporte generado")
def create_report_history(body: ReportHistoryInput, user: CurrentUser, db: DbSession):
    get_course_section_for_user(db, user, body.course_section_id)
    item = ReportHistory(id=f"RPT-{uuid.uuid4().hex.upper()}", user_id=user.id,
                         course_section_id=body.course_section_id,
                         report_type=body.report_type, filename=body.filename,
                         row_count=body.row_count, csv_content=body.csv_content)
    db.add(item)
    db.commit()
    return item


@reports_router.get("", response_model=list[ReportHistoryOut],
                    summary="Consultar historial propio de reportes")
def list_report_history(user: CurrentUser, db: DbSession,
                        course_section_id: str | None = Query(default=None)):
    query = select(ReportHistory).where(ReportHistory.user_id == user.id)
    if course_section_id:
        get_course_section_for_user(db, user, course_section_id)
        query = query.where(ReportHistory.course_section_id == course_section_id)
    return list(db.scalars(query.order_by(ReportHistory.created_at.desc()).limit(100)))


@reports_router.get("/{report_id}/csv", summary="Descargar el CSV previamente generado")
def download_report_csv(report_id: str, user: CurrentUser, db: DbSession):
    item = db.get(ReportHistory, report_id)
    if item is None or (item.user_id != user.id and not is_admin(user)):
        raise HTTPException(404, "Reporte no encontrado")
    if item.csv_content is None:
        raise HTTPException(404, "El reporte anterior no tiene archivo guardado; vuelve a generarlo")
    from fastapi.responses import Response as CsvResponse
    filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", item.filename)
    return CsvResponse(item.csv_content, media_type="text/csv; charset=utf-8",
                       headers={"Content-Disposition": f'attachment; filename="{filename}"',
                                "Cache-Control": "no-store"})

@admin_router.get("/teachers", response_model=list[UserOut], summary="Administración: listar docentes")
def list_teachers(user: CurrentUser, db: DbSession):
    require_admin(user)
    return list(db.scalars(select(User).where(User.role == "teacher").order_by(User.full_name)))

@health_router.get("/ready", status_code=200, summary="Comprobación de disponibilidad de PostgreSQL")
def readiness(db: DbSession):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Base de datos no disponible") from None
    return {"status": "ready"}
