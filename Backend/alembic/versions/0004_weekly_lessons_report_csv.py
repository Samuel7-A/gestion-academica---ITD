"""Horario semanal y CSV persistente para reportes. Revision 0004, depends 0003."""
from alembic import op
import sqlalchemy as sa
revision='0004'
down_revision='0003'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('weekly_lessons',
       sa.Column('id',sa.String(60),primary_key=True),
       sa.Column('course_section_id',sa.String(50),sa.ForeignKey('course_sections.id',ondelete='CASCADE'),nullable=False),
       sa.Column('day',sa.String(12),nullable=False),
       sa.Column('slot',sa.String(5),nullable=False),
       sa.Column('room',sa.String(80),nullable=False),
       sa.UniqueConstraint('course_section_id','day','slot',name='uq_weekly_lesson_section_day_slot'),
       sa.CheckConstraint("day IN ('lunes','martes','miercoles','jueves','viernes')",name='ck_weekly_lessons_day_valid'),
       sa.CheckConstraint("slot IN ('07-09','09-11','11-13','14-16')",name='ck_weekly_lessons_slot_valid'))
    op.create_index('ix_weekly_lessons_course_section_id','weekly_lessons',['course_section_id'])
    op.add_column('report_history',sa.Column('csv_content',sa.Text(),nullable=True))
    if op.get_bind().dialect.name=='postgresql':
        op.execute('ALTER TABLE weekly_lessons ENABLE ROW LEVEL SECURITY')

def downgrade():
    op.drop_column('report_history','csv_content')
    op.drop_index('ix_weekly_lessons_course_section_id',table_name='weekly_lessons')
    op.drop_table('weekly_lessons')
