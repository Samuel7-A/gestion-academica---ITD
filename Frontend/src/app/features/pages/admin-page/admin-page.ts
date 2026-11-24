import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService } from '../../../services/academic-api.service';
import { IntegrationApiService, TeacherDto, WeeklyLessonDto } from '../../../services/integration-api.service';
import { UsuarioService } from '../../../services/usuario.service';
import { CourseSection } from '../../../models/courseSection';
@Component({selector:'app-admin-page',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./admin-page.html',styleUrls:['./admin-page.css']})
export class AdminPageComponent implements OnInit{
  readonly users=inject(UsuarioService);private api=inject(IntegrationApiService);private academic=inject(AcademicApiService);
  readonly teachers=signal<TeacherDto[]>([]);readonly sections=signal<CourseSection[]>([]);readonly lessons=signal<WeeklyLessonDto[]>([]);
  readonly error=signal('');readonly notice=signal('');readonly busy=signal(false);readonly inviteToken=signal('');
  inviteEmail='';courseId='';teacherId='';day='lunes';slot='07-09';room='Aula 302';
  get isAdmin():boolean{return this.users.currentUser()?.role==='admin';}
  ngOnInit():void{if(this.isAdmin)void this.refresh();}
  async refresh():Promise<void>{
    if(!this.isAdmin)return;
    this.error.set('');
    try{
      const [t,s,l]=await Promise.all([firstValueFrom(this.api.adminTeachers()),firstValueFrom(this.academic.sections()),firstValueFrom(this.api.listWeeklySchedule())]);
      this.teachers.set(t);this.sections.set(s);this.lessons.set(l);
      if(!this.courseId)this.courseId=s[0]?.id||'';
      if(!this.teacherId)this.teacherId=t[0]?.id||'';
    }catch(e){this.error.set(this.academic.errorMessage(e));}
  }
  async invite():Promise<void>{
    if(!this.inviteEmail.trim()||this.busy())return;
    this.busy.set(true);this.error.set('');this.inviteToken.set('');
    try{const r=await firstValueFrom(this.api.adminInvite(this.inviteEmail.trim()));this.inviteToken.set(r.invite_token);this.notice.set('Entrega este código por un canal privado; se muestra una sola vez.');}
    catch(e){this.error.set(this.academic.errorMessage(e));}finally{this.busy.set(false);}
  }
  async assign():Promise<void>{
    if(!this.courseId||!this.teacherId||this.busy())return;
    this.busy.set(true);this.error.set('');
    try{await firstValueFrom(this.api.adminAssign(this.courseId,this.teacherId));this.notice.set('Docente asignado.');await this.refresh();}
    catch(e){this.error.set(this.academic.errorMessage(e));}finally{this.busy.set(false);}
  }
  async addLesson():Promise<void>{
    if(!this.courseId||!this.room.trim()||this.busy())return;
    this.busy.set(true);this.error.set('');
    try{await firstValueFrom(this.api.adminAddLesson({course_section_id:this.courseId,day:this.day,slot:this.slot,room:this.room.trim()}));this.notice.set('Horario guardado en PostgreSQL.');await this.refresh();}
    catch(e){this.error.set(this.academic.errorMessage(e));}finally{this.busy.set(false);}
  }
  async deleteLesson(id:string):Promise<void>{
    if(this.busy()||!confirm('¿Eliminar esta clase del horario semanal?'))return;
    this.busy.set(true);this.error.set('');
    try{await firstValueFrom(this.api.adminDeleteLesson(id));this.notice.set('Clase eliminada.');await this.refresh();}
    catch(e){this.error.set(this.academic.errorMessage(e));}finally{this.busy.set(false);}
  }
  async seedDemo():Promise<void>{
    if(this.busy()||!confirm('¿Cargar clases sintéticas? Solo funciona si el horario está completamente vacío.'))return;
    this.busy.set(true);this.error.set('');
    try{await firstValueFrom(this.api.adminSeedDemo());this.notice.set('Horario sintético cargado.');await this.refresh();}
    catch(e){this.error.set(this.academic.errorMessage(e));}finally{this.busy.set(false);}
  }
}
