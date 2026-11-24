import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService } from '../../../services/academic-api.service';
import { IntegrationApiService, ExamScheduleDto, TeacherDto } from '../../../services/integration-api.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Activity } from '../../../models/activity';
import { CourseSection } from '../../../models/courseSection';

type ExamStatus = 'pendiente'|'realizado'|'cancelado';
interface ExamSchedule {date:string;time:string;room:string;status:ExamStatus}
interface ExamRow {activity:Activity;section:CourseSection;schedule:ExamSchedule|null}
@Component({selector:'app-exams-page',standalone:true,imports:[CommonModule,FormsModule],
  templateUrl:'./exams-page.html',styleUrls:['../academic-pages.css','./exams-page.css']})
export class ExamsPageComponent implements OnInit{
  readonly api=inject(AcademicApiService);
  private integration=inject(IntegrationApiService);
  readonly userService=inject(UsuarioService);
  readonly teacherDirectory=signal<TeacherDto[]>([]);
  readonly isAdmin=computed(()=>this.userService.currentUser()?.role==='admin');
  readonly sections=signal<CourseSection[]>([]);readonly exams=signal<ExamRow[]>([]);
  readonly selectedCourse=signal('todos');readonly selectedStatus=signal('todos');
  readonly loading=signal(false);readonly saving=signal(false);readonly error=signal('');readonly notice=signal('');
  readonly showEditor=signal(false);readonly editActivityId=signal('');
  readonly form=signal({sectionId:'',title:'',bimester:1,date:'',time:'08:30',room:'',status:'pendiente' as ExamStatus});
  readonly filteredExams=computed(()=>this.exams().filter(e=>(this.selectedCourse()==='todos'||e.section.id===this.selectedCourse()) &&
    (this.selectedStatus()==='todos'||this.statusOf(e)===this.selectedStatus())));
  readonly nextExam=computed(()=>this.exams().filter(e=>e.schedule?.date && this.statusOf(e)==='pendiente' &&
    new Date(`${e.schedule.date}T${e.schedule.time||'00:00'}`).getTime()>=Date.now())
    .sort((a,b)=>`${a.schedule?.date}T${a.schedule?.time}`.localeCompare(`${b.schedule?.date}T${b.schedule?.time}`))[0]);
  /** Nombre responsable: el docente propio o el catálogo autorizado para administradores. */
  teacherName(section:CourseSection):string{
    const current=this.userService.currentUser();
    if(current?.id===section.teacher_id)return current.full_name?.trim()||current.email;
    const teacher=this.teacherDirectory().find(t=>t.id===section.teacher_id);
    return teacher?.full_name?.trim()||teacher?.email||`ID: ${section.teacher_id}`;
  }
  ngOnInit():void{void this.load();}
  private fromDto(s:ExamScheduleDto):ExamSchedule|null{
    if(!s.schedule_date)return null;
    return {date:s.schedule_date,time:s.schedule_time?.slice(0,5)||'08:30',room:s.room||'',status:s.status==='sin-fecha'?'pendiente':s.status};
  }
  statusOf(e:ExamRow):ExamStatus|'sin-fecha'{return e.schedule?.date?e.schedule.status:'sin-fecha';}
  statusName(e:ExamRow):string{return {pendiente:'Pendiente',realizado:'Realizado',cancelado:'Cancelado','sin-fecha':'Sin fecha'}[this.statusOf(e)];}
  formatDate(date:string):string{if(!date)return 'Sin programar';const[y,m,d]=date.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'});}
  private isExam(a:Activity):boolean{return /examen|evaluaci[oó]n|control|prueba|parcial|quiz/i.test(a.title);}
  async load():Promise<void>{
    this.loading.set(true);this.error.set('');
    try{
      if(this.isAdmin()){
        try{this.teacherDirectory.set(await firstValueFrom(this.integration.adminTeachers()));}
        catch{this.teacherDirectory.set([]);}
      }
      const sections=(await firstValueFrom(this.api.sections())).sort((a,b)=>b.year-a.year||a.course_name.localeCompare(b.course_name));
      this.sections.set(sections);
      const all=await Promise.all(sections.map(async section=>{
        const [activities, schedules]=await Promise.all([firstValueFrom(this.api.activities(section.id)),firstValueFrom(this.integration.listExamSchedules(section.id))]);
        const byId=new Map(schedules.map(s=>[s.activity_id,s]));
        return activities.filter(a=>this.isExam(a)).map(activity=>({activity,section,schedule:byId.has(activity.id)?this.fromDto(byId.get(activity.id)!):null} as ExamRow));
      }));
      this.exams.set(all.flat());
      if(!this.form().sectionId)this.form.update(f=>({...f,sectionId:sections[0]?.id||''}));
    }catch(e){this.error.set(this.api.errorMessage(e));}finally{this.loading.set(false);}
  }
  newExam():void{
    const section=this.selectedCourse()!=='todos'?this.selectedCourse():this.sections()[0]?.id||'';
    this.editActivityId.set('');this.form.set({sectionId:section,title:'',bimester:1,date:'',time:'08:30',room:'',status:'pendiente'});
    this.notice.set('');this.showEditor.set(true);
  }
  editExam(e:ExamRow):void{
    this.editActivityId.set(e.activity.id);
    this.form.set({sectionId:e.section.id,title:e.activity.title,bimester:e.activity.bimester,date:e.schedule?.date||'',time:e.schedule?.time||'08:30',room:e.schedule?.room||'',status:e.schedule?.status||'pendiente'});
    this.notice.set('');this.showEditor.set(true);
  }
  async save():Promise<void>{
    if(this.saving())return;
    const f=this.form();
    if(!f.sectionId||!f.title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(f.date)||!/^\d{2}:\d{2}$/.test(f.time)){
      this.error.set('Completa curso, examen, fecha y hora válidas.');return;
    }
    this.saving.set(true);this.error.set('');
    try{
      let id=this.editActivityId();
      if(!id){const created=await firstValueFrom(this.api.createActivity(f.sectionId,f.title.trim(),f.bimester));id=created.id;}
      await firstValueFrom(this.integration.saveExamSchedule(id,{schedule_date:f.date,schedule_time:`${f.time}:00`,room:f.room.trim(),status:f.status}));
      this.showEditor.set(false);await this.load();
      this.notice.set('Examen guardado en PostgreSQL. Se conservará después de recargar.');
    }catch(e){this.error.set(this.api.errorMessage(e));}finally{this.saving.set(false);}
  }
}
