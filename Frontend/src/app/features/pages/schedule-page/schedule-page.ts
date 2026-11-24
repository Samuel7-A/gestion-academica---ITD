import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  classFor, mondayOf, SAMPLE_CLASSES, shiftMonday, TIME_SLOTS, WEEK_DAYS, weekLabel,
  type DayId, type SlotId
} from './schedule-data';

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  templateUrl: './schedule-page.html',
  styleUrls: ['./schedule-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulePageComponent {
  readonly days = WEEK_DAYS;
  readonly slots = TIME_SLOTS;
  readonly weeklyCount = SAMPLE_CLASSES.length;
  readonly monday = signal(mondayOf(new Date()));
  readonly dateRange = computed(() => weekLabel(this.monday()));
  readonly isCurrentWeek = computed(() => this.monday().getTime() === mondayOf(new Date()).getTime());

  readonly getClass = (day: DayId, slot: SlotId) => classFor(day, slot);

  previousWeek(): void { this.monday.update(date => shiftMonday(date, -1)); }
  nextWeek(): void { this.monday.update(date => shiftMonday(date, 1)); }
  goToToday(): void { this.monday.set(mondayOf(new Date())); }
  printSchedule(): void { window.print(); }
}
