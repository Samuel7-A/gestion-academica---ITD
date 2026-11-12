"""Modelos SQLAlchemy: estructura de la base de datos acordada en el plan APF3.

Identificadores de tipo texto (STU-001, CRS-MAT, CS-2026-001...).
Notas entre 0 y 20, porcentajes entre 0 y 100, bimestres del 1 al 4.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# Numeric que devuelve float en Python (y no Decimal).
GradeValue = Numeric(4, 2, asdecimal=False)
Percentage = Numeric(5, 2, asdecimal=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('teacher', 'admin')", name="role_valid"),)

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="teacher")
    # Campo adicional (no rompe el contrato): nombre visible del docente en la interfaz.
    full_name: Mapped[str | None] = mapped_column(String(150))


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    full_name: Mapped[str] = mapped_column(String(150))


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Section(Base):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("year", "grade_level", "section_name", name="uq_sections_year_grade_section"),
        CheckConstraint("year BETWEEN 2000 AND 2100", name="year_valid"),
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    grade_level: Mapped[str] = mapped_column(String(50))
    section_name: Mapped[str] = mapped_column(String(20))


class CourseSection(Base):
    __tablename__ = "course_sections"
    __table_args__ = (UniqueConstraint("course_id", "section_id", name="uq_course_sections_course_section"),)

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="RESTRICT"))
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id", ondelete="RESTRICT"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)

    course: Mapped[Course] = relationship(lazy="joined")
    section: Mapped[Section] = relationship(lazy="joined")
    teacher: Mapped[User] = relationship()


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "course_section_id", name="uq_enrollments_student_course_section"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    course_section_id: Mapped[str] = mapped_column(
        ForeignKey("course_sections.id", ondelete="CASCADE"), index=True
    )

    student: Mapped[Student] = relationship()


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (CheckConstraint("bimester BETWEEN 1 AND 4", name="bimester_valid"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    course_section_id: Mapped[str] = mapped_column(
        ForeignKey("course_sections.id", ondelete="CASCADE"), index=True
    )
    bimester: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(150))


class Grade(Base):
    __tablename__ = "grades"
    __table_args__ = (
        # Un estudiante no puede tener dos notas para la misma actividad.
        UniqueConstraint("activity_id", "student_id", name="uq_grades_activity_student"),
        CheckConstraint("value >= 0 AND value <= 20", name="value_range"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    activity_id: Mapped[str] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    value: Mapped[float] = mapped_column(GradeValue)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AcademicIndicator(Base):
    __tablename__ = "academic_indicators"
    __table_args__ = (
        CheckConstraint("attendance_pct >= 0 AND attendance_pct <= 100", name="attendance_range"),
        CheckConstraint("homework_pct >= 0 AND homework_pct <= 100", name="homework_range"),
        CheckConstraint("participation_pct >= 0 AND participation_pct <= 100", name="participation_range"),
        CheckConstraint(
            "previous_average IS NULL OR (previous_average >= 0 AND previous_average <= 20)",
            name="previous_average_range",
        ),
    )

    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    course_section_id: Mapped[str] = mapped_column(
        ForeignKey("course_sections.id", ondelete="CASCADE"), primary_key=True
    )
    attendance_pct: Mapped[float] = mapped_column(Percentage)
    homework_pct: Mapped[float] = mapped_column(Percentage)
    participation_pct: Mapped[float] = mapped_column(Percentage)
    previous_average: Mapped[float | None] = mapped_column(GradeValue)


class AnnualResult(Base):
    """Nota final anual. Solo para años históricos ya completados."""

    __tablename__ = "annual_results"
    __table_args__ = (CheckConstraint("final_grade >= 0 AND final_grade <= 20", name="final_grade_range"),)

    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    course_section_id: Mapped[str] = mapped_column(
        ForeignKey("course_sections.id", ondelete="CASCADE"), primary_key=True
    )
    final_grade: Mapped[float] = mapped_column(GradeValue)
