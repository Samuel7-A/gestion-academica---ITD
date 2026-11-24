"""Añade invitaciones seguras, horarios de exámenes e historial de reportes.

Revision ID: 0003
Revises: 0002
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("teacher_invites", "exam_schedules", "report_history")


def upgrade() -> None:
    op.create_table(
        "teacher_invites",
        sa.Column("id", sa.String(60), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("created_by", sa.String(50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_teacher_invites_email", "teacher_invites", ["email"])
    op.create_index("ix_teacher_invites_token_hash", "teacher_invites", ["token_hash"], unique=True)
    op.create_table(
        "exam_schedules",
        sa.Column("activity_id", sa.String(80), sa.ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("schedule_date", sa.Date(), nullable=True),
        sa.Column("schedule_time", sa.Time(), nullable=True),
        sa.Column("room", sa.String(80), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('sin-fecha', 'pendiente', 'realizado', 'cancelado')", name="ck_exam_schedules_exam_schedule_status_valid"),
    )
    op.create_table(
        "report_history",
        sa.Column("id", sa.String(60), primary_key=True),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_section_id", sa.String(50), sa.ForeignKey("course_sections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_type", sa.String(35), nullable=False),
        sa.Column("filename", sa.String(180), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("row_count >= 0", name="ck_report_history_report_history_rows_nonnegative"),
    )
    op.create_index("ix_report_history_user_id", "report_history", ["user_id"])
    op.create_index("ix_report_history_course_section_id", "report_history", ["course_section_id"])

    if op.get_bind().dialect.name == "postgresql":
        for table in TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_report_history_course_section_id", table_name="report_history")
    op.drop_index("ix_report_history_user_id", table_name="report_history")
    op.drop_table("report_history")
    op.drop_table("exam_schedules")
    op.drop_index("ix_teacher_invites_token_hash", table_name="teacher_invites")
    op.drop_index("ix_teacher_invites_email", table_name="teacher_invites")
    op.drop_table("teacher_invites")
