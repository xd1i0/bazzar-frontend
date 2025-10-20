import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-play',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      [style.display]="'block'">
      <path
        d="M3.33337 2L12.6667 8L3.33337 14V2Z"
        [attr.stroke]="color"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"/>
    </svg>
  `
})
export class IconPlayComponent {
  @Input() size: number = 24;
  @Input() color: string = 'currentColor';
}
