import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IntegrationApiService, WeeklyLessonDto } from '../../../services/integration-api.service';
import { firstValueFrom } from 'rxjs';
import {mondayOf, shiftMonday, TIME_SLOTS, WEEK_DAYS, weekLabel,type DayId,type SlotId,type WeeklyClass,type ColorTone} from './schedule-data';
@Component({selector:'app-schedule-page',standalone:true,templateUrl:'./schedule-page.html',styleUrls:['./schedule-page.css'],changeDetection:ChangeDetectionStrategy.OnPush})
export class SchedulePageComponent implements OnInit{
  private readonly api=inject(IntegrationApiService);
  readonly days=WEEK_DAYS;readonly slots=TIME_SLOTS;
  readonly classes=signal<WeeklyClass[]>([]);
  readonly loading=signal(true);readonly error=signal('');
  readonly weeklyCount=computed(()=>this.classes().length);
  readonly monday=signal(mondayOf(new Date()));
  readonly dateRange=computed(()=>weekLabel(this.monday()));
  readonly isCurrentWeek=computed(()=>this.monday().getTime()===mondayOf(new Date()).getTime());
  private tone(subject:string):ColorTone{
    if(/matem/i.test(subject))return 'azul';
    if(/comunic/i.test(subject))return 'violeta';
    if(/cienc/i.test(subject))return 'verde';
    if(/social|histor/i.test(subject))return 'naranja';
    return 'rosa';
  }
  async ngOnInit():Promise<void>{
    try{
      const rows=await firstValueFrom(this.api.listWeeklySchedule());
      this.classes.set(rows.map((v:WeeklyLessonDto)=>({id:v.id,day:v.day as DayId,slot:v.slot as Exclude<SlotId,'receso'>,
        subject:v.subject,group:v.group,place:v.room,teacher:v.teacher,tone:this.tone(v.subject)})));
    }catch(e){this.error.set('No se pudo consultar el horario institucional. Comprueba tu sesión y FastAPI.');}
    finally{this.loading.set(false);}
  }
  getClass(day:DayId,slot:SlotId):WeeklyClass|undefined{return this.classes().find(x=>x.day===day&&x.slot===slot);}
  previousWeek():void{this.monday.update(d=>shiftMonday(d,-1));}
  nextWeek():void{this.monday.update(d=>shiftMonday(d,1));}
  goToToday():void{this.monday.set(mondayOf(new Date()));}
  printSchedule():void{window.print();}
}
