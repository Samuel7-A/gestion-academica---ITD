import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ACADEMIC_API_URL } from '../core/config/api.config';
export interface ExamScheduleDto {activity_id:string;schedule_date:string|null;schedule_time:string|null;room:string|null;status:'sin-fecha'|'pendiente'|'realizado'|'cancelado';updated_at:string}
export interface ReportDto {id:string;user_id:string;course_section_id:string;report_type:string;filename:string;row_count:number;created_at:string}
export interface WeeklyLessonDto {id:string;course_section_id:string;day:string;slot:string;room:string;subject:string;group:string;teacher:string}
export interface TeacherDto {id:string;email:string;full_name:string|null;role:string}
@Injectable({providedIn:'root'})
export class IntegrationApiService {
  private http=inject(HttpClient);private api=ACADEMIC_API_URL;
  listExamSchedules(section:string):Observable<ExamScheduleDto[]>{return this.http.get<ExamScheduleDto[]>(`${this.api}/course-sections/${encodeURIComponent(section)}/exam-schedules`);}
  saveExamSchedule(id:string,data:{schedule_date:string;schedule_time:string;room:string;status:string}):Observable<ExamScheduleDto>{return this.http.put<ExamScheduleDto>(`${this.api}/activities/${encodeURIComponent(id)}/schedule`,data);}
  listReports():Observable<ReportDto[]>{return this.http.get<ReportDto[]>(`${this.api}/reports`);}
  createReport(data:{course_section_id:string;report_type:string;filename:string;row_count:number;csv_content:string}):Observable<ReportDto>{return this.http.post<ReportDto>(`${this.api}/reports`,data);}
  downloadReport(id:string):Observable<string>{return this.http.get(`${this.api}/reports/${encodeURIComponent(id)}/csv`,{responseType:'text'});}
  listWeeklySchedule():Observable<WeeklyLessonDto[]>{return this.http.get<WeeklyLessonDto[]>(`${this.api}/weekly-schedule`);}
  adminTeachers():Observable<TeacherDto[]>{return this.http.get<TeacherDto[]>(`${this.api}/admin/teachers`);}
  adminInvite(email:string):Observable<{email:string;invite_token:string;expires_at:string}>{return this.http.post<{email:string;invite_token:string;expires_at:string}>(`${this.api}/auth/invitations`,{email});}
  adminAssign(sectionId:string,teacherId:string):Observable<unknown>{return this.http.post(`${this.api}/admin/assign-course`,{course_section_id:sectionId,teacher_id:teacherId});}
  adminAddLesson(data:{course_section_id:string;day:string;slot:string;room:string}):Observable<WeeklyLessonDto>{return this.http.post<WeeklyLessonDto>(`${this.api}/weekly-schedule`,data);}
  adminDeleteLesson(id:string):Observable<void>{return this.http.delete<void>(`${this.api}/weekly-schedule/${encodeURIComponent(id)}`);}
  adminSeedDemo():Observable<WeeklyLessonDto[]>{return this.http.post<WeeklyLessonDto[]>(`${this.api}/weekly-schedule/demo/populate`,{});}
}
