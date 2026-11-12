"""habilitar RLS en todas las tablas

Supabase expone automáticamente las tablas del esquema public mediante su Data API
(PostgREST) a cualquiera con la clave pública "anon". Al activar Row Level Security
sin políticas, esa vía queda bloqueada. El backend no se ve afectado porque se conecta
como dueño de las tablas, y los dueños no están sujetos a RLS.

En PostgreSQL local (Docker) no cambia nada en la práctica.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "users",
    "students",
    "courses",
    "sections",
    "course_sections",
    "enrollments",
    "activities",
    "grades",
    "academic_indicators",
    "annual_results",
    "alembic_version",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
