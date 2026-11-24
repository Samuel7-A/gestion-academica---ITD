"""Horario de clases persistente y protegido por rol y asignación de docente."""
from __future__ import annotations
import uuid
from typing import Literal
from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.api.deps import CurrentUser, DbSession, is_admin, get_course_section_for_user
from app.models import CourseSection
from app.models_timetable import WeeklyLesson

router = APIRouter(prefix='/weekly-schedule', tags=['Horario de clases'])
Day = Literal['lunes','martes','miercoles','jueves','viernes']
Slot = Literal['07-09','09-11','11-13','14-16']

class LessonInput(BaseModel):
    course_section_id: str = Field(min_length=1, max_length=50)
    day: Day
    slot: Slot
    room: str = Field(min_length=1, max_length=80)

class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    course_section_id: str
    day: str
    slot: str
    room: str
    subject: str
    group: str
    teacher: str

def as_out(obj: WeeklyLesson, section: CourseSection) -> LessonOut:
    return LessonOut(id=obj.id, course_section_id=obj.course_section_id,
                     day=obj.day, slot=obj.slot, room=obj.room,
                     subject=section.course.name,
                     group=f'{section.section.grade_level} {section.section.section_name}',
                     teacher=section.teacher.full_name or section.teacher.email)

def admin_only(user) -> None:
    if not is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Solo el administrador puede configurar horarios')

def validate_slot(db, section: CourseSection, body: LessonInput, exclude_id: str | None = None) -> None:
    room = body.room.strip().casefold()
    existing = db.scalars(select(WeeklyLesson).where(WeeklyLesson.day==body.day,WeeklyLesson.slot==body.slot)).all()
    for row in existing:
        if row.id == exclude_id:
            continue
        other = db.get(CourseSection,row.course_section_id)
        if other and other.teacher_id == section.teacher_id:
            raise HTTPException(409, 'El docente ya tiene otra clase en esa franja')
        if other and row.room.strip().casefold() == room:
            raise HTTPException(409, 'El aula ya está asignada a otra clase en esa franja')
        if row.course_section_id == body.course_section_id:
            raise HTTPException(409, 'La sección ya tiene clase en esa franja')

@router.get('', response_model=list[LessonOut], summary='Horario visible para el docente autenticado')
def list_weekly_schedule(user: CurrentUser, db: DbSession):
    query = select(WeeklyLesson).join(CourseSection, CourseSection.id==WeeklyLesson.course_section_id)
    if not is_admin(user):
        query = query.where(CourseSection.teacher_id==user.id)
    lessons = db.scalars(query.order_by(WeeklyLesson.day, WeeklyLesson.slot)).all()
    return [as_out(item,db.get(CourseSection,item.course_section_id)) for item in lessons]

@router.post('', status_code=201, response_model=LessonOut, summary='Administrador: programar clase semanal')
def create_lesson(body: LessonInput, user: CurrentUser, db: DbSession):
    admin_only(user)
    section=get_course_section_for_user(db,user,body.course_section_id)
    validate_slot(db,section,body)
    item=WeeklyLesson(id=f'WK-{uuid.uuid4().hex[:20].upper()}',course_section_id=body.course_section_id,
                      day=body.day,slot=body.slot,room=body.room.strip())
    db.add(item)
    try: db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'Conflicto de horario') from None
    return as_out(item,section)

@router.put('/{lesson_id}',response_model=LessonOut,summary='Administrador: modificar clase semanal')
def update_lesson(lesson_id:str,body:LessonInput,user:CurrentUser,db:DbSession):
    admin_only(user)
    item=db.get(WeeklyLesson,lesson_id)
    if item is None: raise HTTPException(404,'Clase no encontrada')
    section=get_course_section_for_user(db,user,body.course_section_id)
    validate_slot(db,section,body,lesson_id)
    item.course_section_id=body.course_section_id
    item.day=body.day; item.slot=body.slot; item.room=body.room.strip()
    try: db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'Conflicto de horario') from None
    return as_out(item,section)

@router.delete('/{lesson_id}',status_code=204,summary='Administrador: eliminar clase semanal')
def delete_lesson(lesson_id:str,user:CurrentUser,db:DbSession):
    admin_only(user)
    item=db.get(WeeklyLesson,lesson_id)
    if item is None: raise HTTPException(404,'Clase no encontrada')
    db.delete(item);db.commit()
    return Response(status_code=204)

@router.post('/demo/populate',response_model=list[LessonOut],summary='Administrador: cargar horarios sintéticos una sola vez')
def populate_demo(user: CurrentUser,db:DbSession):
    admin_only(user)
    if db.scalar(select(WeeklyLesson.id).limit(1)):
        raise HTTPException(409,'Ya hay horarios configurados: no se sobreescribe nada')
    candidates=[('CS-2026-001','lunes','07-09','Aula 302'),
                ('CS-2026-001','miercoles','07-09','Aula 302'),
                ('CS-2026-002','martes','11-13','Aula 104'),
                ('CS-2026-002','jueves','14-16','Aula 104'),
                ('CS-2026-003','martes','09-11','Laboratorio'),
                ('CS-2026-003','jueves','09-11','Laboratorio'),
                ('CS-2026-004','viernes','09-11','Aula 305')]
    rows=[]
    for course_section_id,day,slot,room in candidates:
        section=db.get(CourseSection,course_section_id)
        if section is None: continue
        entry=WeeklyLesson(id=f'WK-{uuid.uuid4().hex[:20].upper()}',course_section_id=section.id,day=day,slot=slot,room=room)
        rows.append((entry,section))
    if not rows: raise HTTPException(404,'No existen cursos demo 2026; carga primero la semilla de demostración')
    for item,_ in rows: db.add(item)
    db.commit()
    return [as_out(item,section) for item,section in rows]
