"""Ampliaciones persistentes del backend: invitaciones, exámenes y reportes.

El frontend solo consulta la API. Nunca accede directamente a PostgreSQL.
"""
from datetime import date, datetime, time

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base, utcnow


class TeacherInvite(Base):
    __tablename__ = "teacher_invites"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"
    __table_args__ = (
        CheckConstraint("status IN ('sin-fecha', 'pendiente', 'realizado', 'cancelado')", name="exam_schedule_status_valid"),
    )
    # Una programación por actividad. La actividad enlaza con el curso y su docente.
    activity_id: Mapped[str] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True)
    schedule_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    schedule_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    room: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="sin-fecha")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ReportHistory(Base):
    __tablename__ = "report_history"
    __table_args__ = (
        CheckConstraint("row_count >= 0", name="report_history_rows_nonnegative"),
    )
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_section_id: Mapped[str] = mapped_column(ForeignKey("course_sections.id", ondelete="CASCADE"), index=True)
    report_type: Mapped[str] = mapped_column(String(35))
    filename: Mapped[str] = mapped_column(String(180))
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
