"""Esquemas Pydantic: formato JSON (snake_case) de solicitudes y respuestas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RiskLevel = Literal["bajo", "moderado", "alto"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Autenticación ----------

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255, examples=["docente1@demo.edu.pe"])
    password: str = Field(min_length=1, max_length=128, examples=["Docente123!"])

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(ORMModel):
    id: str
    email: str
    role: str
    full_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut


# ---------- Gestión académica ----------

class CourseSectionOut(BaseModel):
    id: str
    course_id: str
    course_name: str
    section_id: str
    year: int
    grade_level: str
    section_name: str
    teacher_id: str
    student_count: int


class StudentOut(ORMModel):
    id: str
    code: str
    full_name: str


class ActivityCreate(BaseModel):
    bimester: int = Field(ge=1, le=4, examples=[2])
    title: str = Field(min_length=1, max_length=150, examples=["Práctica calificada 2"])

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El título no puede estar vacío")
        return v


class ActivityOut(ORMModel):
    id: str
    course_section_id: str
    bimester: int
    title: str


class GradeUpdate(BaseModel):
    value: float = Field(ge=0, le=20, examples=[15.5])

    @field_validator("value")
    @classmethod
    def round_value(cls, v: float) -> float:
        return round(v, 2)


class GradeOut(ORMModel):
    id: str
    activity_id: str
    student_id: str
    value: float
    updated_at: datetime


class BimesterAverages(BaseModel):
    bimester_1: float | None = None
    bimester_2: float | None = None
    bimester_3: float | None = None
    bimester_4: float | None = None


class GradebookGrade(BaseModel):
    activity_id: str
    value: float
    updated_at: datetime


class GradebookStudent(BaseModel):
    student_id: str
    code: str
    full_name: str
    grades: list[GradebookGrade]
    bimester_averages: BimesterAverages
    current_average: float | None = Field(
        description="Promedio de los bimestres que ya tienen notas. No es la nota oficial final."
    )


class GradebookOut(BaseModel):
    course_section: CourseSectionOut
    activities: list[ActivityOut]
    students: list[GradebookStudent]


class AcademicHistoryRecord(BaseModel):
    course_section_id: str
    year: int
    course_id: str
    course_name: str
    grade_level: str
    section_name: str
    bimester_averages: BimesterAverages
    current_average: float | None
    final_grade: float | None = Field(description="Solo existe para años históricos completados.")
    attendance_pct: float | None = None
    homework_pct: float | None = None
    participation_pct: float | None = None
    previous_average: float | None = None


class AcademicHistoryOut(BaseModel):
    student: StudentOut
    records: list[AcademicHistoryRecord]


# ---------- Machine Learning ----------

class PredictionFeatures(BaseModel):
    grade_bimester_1: float
    grade_bimester_2: float
    attendance_pct: float
    homework_pct: float
    participation_pct: float
    previous_average: float


class PredictRequest(BaseModel):
    student_id: str = Field(examples=["STU-001"])
    course_section_id: str = Field(examples=["CS-2026-001"])


class PredictResponse(BaseModel):
    student_id: str
    course_section_id: str
    predicted_final_grade: float
    risk_level: RiskLevel
    synthetic_data: bool = True
    model_version: str
    features: PredictionFeatures


class GroupsRequest(BaseModel):
    course_section_id: str = Field(examples=["CS-2026-001"])
    n_groups: int = Field(ge=1, le=50, examples=[4])


class GroupOut(BaseModel):
    group_number: int
    student_ids: list[str]


class GroupsResponse(BaseModel):
    course_section_id: str
    n_groups: int
    groups: list[GroupOut]
    synthetic_data: bool = True
    model_version: str


# ---------- Sistema ----------

class HealthOut(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "error"]
    ml_mode: Literal["model", "mock"]
    version: str
