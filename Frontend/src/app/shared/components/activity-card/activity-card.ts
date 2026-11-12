import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-activity-card',
  standalone: true,
  templateUrl: './activity-card.html',
  styleUrls: ['./activity-card.css']
})
export class ActivityCardComponent {
  @Input({ required: true }) type!: string;
  @Input({ required: true }) day!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) detail!: string;
}