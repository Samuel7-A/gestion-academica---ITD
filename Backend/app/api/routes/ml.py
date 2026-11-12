from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession, ensure_enrolled, get_course_section_for_user
from app.schemas import GroupOut, GroupsRequest, GroupsResponse, PredictionFeatures, PredictRequest, PredictResponse
from app.services.ml_service import InsufficientDataError, build_features, build_section_students, ml_adapter

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Riesgo académico y nota final proyectada",
    description=(
        "El backend toma las variables del estudiante desde la base de datos y ejecuta los modelos. "
        "Resultados obtenidos con datos sintéticos: demostración técnica, no decisiones reales. "
        "Si model_version es 'mock-v0', la respuesta es simulada (modelos ML aún no integrados)."
    ),
)
def predict(body: PredictRequest, user: CurrentUser, db: DbSession) -> PredictResponse:
    get_course_section_for_user(db, user, body.course_section_id)
    ensure_enrolled(db, body.student_id, body.course_section_id)
    try:
        features = build_features(db, body.student_id, body.course_section_id)
    except InsufficientDataError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))

    grade, risk, version = ml_adapter.predict(features)
    return PredictResponse(
        student_id=body.student_id,
        course_section_id=body.course_section_id,
        predicted_final_grade=grade,
        risk_level=risk,
        synthetic_data=True,
        model_version=version,
        features=PredictionFeatures(**features),
    )


@router.post("/groups", response_model=GroupsResponse, summary="Generar grupos equilibrados de estudiantes")
def groups(body: GroupsRequest, user: CurrentUser, db: DbSession) -> GroupsResponse:
    get_course_section_for_user(db, user, body.course_section_id)
    students = build_section_students(db, body.course_section_id)
    if not students:
        raise HTTPException(status.HTTP_409_CONFLICT, "El curso-sección no tiene estudiantes matriculados")
    if body.n_groups > len(students):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"n_groups ({body.n_groups}) no puede ser mayor que la cantidad de estudiantes ({len(students)})",
        )

    groups, version = ml_adapter.groups(students, body.n_groups)
    return GroupsResponse(
        course_section_id=body.course_section_id,
        n_groups=body.n_groups,
        groups=[GroupOut(group_number=i, student_ids=ids) for i, ids in enumerate(groups, start=1)],
        synthetic_data=True,
        model_version=version,
    )
