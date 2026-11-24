import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AcademicApiService, courseLabel, downloadCsv, makeCsv } from '../../../services/academic-api.service';
import { IntegrationApiService, ReportDto, TeacherDto } from '../../../services/integration-api.service';
import { UsuarioService } from '../../../services/usuario.service';
import { CourseSection } from '../../../models/courseSection';
type ReportType='Notas'|'Asistencia';
interface SavedReport {id:string;type:ReportType;sectionId:string;course:string;generatedAt:string;filename:string;userId:string}
@Component({selector:'app-reports-page',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./reports-page.html',styleUrls:['../academic-pages.css','./reports-page.css']})
export class ReportsPageComponent implements OnInit{
  readonly api=inject(AcademicApiService);private integration=inject(IntegrationApiService);
  readonly userService=inject(UsuarioService);
  readonly teacherDirectory=signal<TeacherDto[]>([]);
  readonly isAdmin=computed(()=>this.userService.currentUser()?.role==='admin');
  readonly sections=signal<CourseSection[]>([]);readonly selectedGrade=signal('todos');readonly selectedSectionId=signal('');
  readonly history=signal<SavedReport[]>([]);readonly busy=signal<ReportType|''>('');readonly loading=signal(false);readonly error=signal('');readonly info=signal('');readonly label=courseLabel;
  readonly grades=computed(()=>[...new Set(this.sections().map(s=>s.grade_level))]);
  readonly filteredSections=computed(()=>this.selectedGrade()==='todos'?this.sections():this.sections().filter(s=>s.grade_level===this.selectedGrade()));
  readonly selectedSection=computed(()=>this.sections().find(s=>s.id===this.selectedSectionId()));
  readonly visibleHistory=computed(()=>this.selectedSectionId()?this.history().filter(h=>h.sectionId===this.selectedSectionId()):this.history());
  /** El responsable del curso no tiene por qué ser quien descargó el reporte. */
  teacherName(section:CourseSection):string{
    const current=this.userService.currentUser();
    if(current?.id===section.teacher_id)return current.full_name?.trim()||current.email;
    const teacher=this.teacherDirectory().find(t=>t.id===section.teacher_id);
    return teacher?.full_name?.trim()||teacher?.email||`ID: ${section.teacher_id}`;
  }
  reportAuthor(item:SavedReport):string{
    const current=this.userService.currentUser();
    if(current?.id===item.userId)return current.full_name?.trim()||current.email;
    const teacher=this.teacherDirectory().find(t=>t.id===item.userId);
    return teacher?.full_name?.trim()||teacher?.email||`ID: ${item.userId}`;
  }
  ngOnInit():void{void this.load();}
  onGradeChange(g:string):void{this.selectedGrade.set(g);if(!this.filteredSections().some(s=>s.id===this.selectedSectionId()))this.selectedSectionId.set(this.filteredSections()[0]?.id||'');}
  onSectionChange(id:string):void{this.selectedSectionId.set(id);}
  private fromDto(dto:ReportDto):SavedReport{
    const section=this.sections().find(s=>s.id===dto.course_section_id);
    return {id:dto.id,type:dto.report_type==='asistencia'?'Asistencia':'Notas',sectionId:dto.course_section_id,course:section?courseLabel(section):dto.course_section_id,generatedAt:dto.created_at,filename:dto.filename,userId:dto.user_id};
  }
  private async refreshHistory():Promise<void>{const rows=await firstValueFrom(this.integration.listReports());this.history.set(rows.map(v=>this.fromDto(v)));}
  async load():Promise<void>{
    this.loading.set(true);this.error.set('');
    try{
      if(this.isAdmin()){
        try{this.teacherDirectory.set(await firstValueFrom(this.integration.adminTeachers()));}
        catch{this.teacherDirectory.set([]);}
      }
      const sections=(await firstValueFrom(this.api.sections())).sort((a,b)=>b.year-a.year||a.course_name.localeCompare(b.course_name));
      this.sections.set(sections);if(!sections.some(s=>s.id===this.selectedSectionId()))this.selectedSectionId.set(sections[0]?.id||'');
      this.onGradeChange(this.selectedGrade());await this.refreshHistory();
    }catch(e){this.error.set(this.api.errorMessage(e));}finally{this.loading.set(false);}
  }
  async generate(type:ReportType):Promise<void>{
    const section=this.selectedSection();if(!section||this.busy())return;
    this.busy.set(type);this.error.set('');this.info.set('');
    try{
      const gradebook=await firstValueFrom(this.api.gradebook(section.id));let rows:Array<Array<string|number|null|undefined>>;
      if(type==='Notas'){
        rows=[['Reporte de notas',courseLabel(section)],['Datos sintéticos; no son actas oficiales'],[],['Código','Estudiante','Bimestre 1','Bimestre 2','Bimestre 3','Bimestre 4','Promedio actual'],
          ...gradebook.students.map(s=>[s.code,s.full_name,s.bimester_averages.bimester_1,s.bimester_averages.bimester_2,s.bimester_averages.bimester_3,s.bimester_averages.bimester_4,s.current_average])];
      }else{
        const results=await Promise.all(gradebook.students.map(async s=>{
          try{const v=await firstValueFrom(this.api.predict(s.student_id,section.id));return [s.code,s.full_name,v.features.attendance_pct] as Array<string|number|null>;}
          catch{return [s.code,s.full_name,'Sin dato'];}
        }));
        if(!results.some(row=>typeof row[2]==='number'))throw new Error('La API no ofrece datos de asistencia disponibles.');
        rows=[['Asistencia sintética',courseLabel(section)],['No es registro de asistencia diaria'],[],['Código','Estudiante','Asistencia (%)'],...results];
      }
      const csv=makeCsv(rows);
      const filename=`reporte_${type.toLowerCase()}_${section.id.toLowerCase().replace(/[^a-z0-9_-]/g,'')}_${new Date().toISOString().slice(0,10)}.csv`;
      await firstValueFrom(this.integration.createReport({course_section_id:section.id,report_type:type==='Notas'?'notas':'asistencia',filename,row_count:gradebook.students.length,csv_content:csv}));
      await this.refreshHistory();downloadCsv(filename,csv);
      this.info.set('CSV descargado y guardado en PostgreSQL para futuras descargas.');
    }catch(e){this.error.set(this.api.errorMessage(e));}finally{this.busy.set('');}
  }
  async download(item:SavedReport):Promise<void>{try{const csv=await firstValueFrom(this.integration.downloadReport(item.id));downloadCsv(item.filename,csv);}catch(e){this.error.set(this.api.errorMessage(e));}}
  displayDate(v:string):string{return new Date(v).toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
}
