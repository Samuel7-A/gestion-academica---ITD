"""Horario semanal recurrente; cada clase referencia una sección académica real."""
from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base

class WeeklyLesson(Base):
    __tablename__ = 'weekly_lessons'
    __table_args__ = (
        UniqueConstraint('course_section_id', 'day', 'slot', name='uq_weekly_lesson_section_day_slot'),
        CheckConstraint("day IN ('lunes','martes','miercoles','jueves','viernes')", name='day_valid'),
        CheckConstraint("slot IN ('07-09','09-11','11-13','14-16')", name='slot_valid'),
    )
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    course_section_id: Mapped[str] = mapped_column(ForeignKey('course_sections.id',ondelete='CASCADE'), index=True)
    day: Mapped[str] = mapped_column(String(12))
    slot: Mapped[str] = mapped_column(String(5))
    room: Mapped[str] = mapped_column(String(80))
