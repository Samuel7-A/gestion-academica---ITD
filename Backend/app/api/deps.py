"""Dependencias compartidas: usuario autenticado y control de acceso por docente."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import CourseSection, Enrollment, Student, User

bearer_scheme = HTTPBearer(auto_error=False, description="Token JWT obtenido en /api/v1/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("No autenticado")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise _unauthorized("El token expiró")
    except jwt.PyJWTError:
        raise _unauthorized("Token inválido")

    user = db.get(User, payload.get("sub"))
    if user is None:
        raise _unauthorized("Usuario no encontrado")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def is_admin(user: User) -> bool:
    return user.role == "admin"


def get_course_section_for_user(db: Session, user: User, course_section_id: str) -> CourseSection:
    """404 si no existe; 403 si pertenece a otro docente."""
    cs = db.get(CourseSection, course_section_id)
    if cs is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso-sección no encontrado")
    if cs.teacher_id != user.id and not is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a este curso-sección")
    return cs


def ensure_enrolled(db: Session, student_id: str, course_section_id: str) -> Student:
    """404 si el estudiante no existe o no está matriculado en el curso-sección."""
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Estudiante no encontrado")
    enrolled = db.scalar(
        select(Enrollment.id).where(
            Enrollment.student_id == student_id,
            Enrollment.course_section_id == course_section_id,
        )
    )
    if enrolled is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "El estudiante no está matriculado en este curso-sección"
        )
    return student
