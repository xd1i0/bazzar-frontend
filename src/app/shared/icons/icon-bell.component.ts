import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-bell',
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
        d="M12 5.33333C12 4.27247 11.5786 3.25505 10.8284 2.50491C10.0783 1.75476 9.06087 1.33333 8 1.33333C6.93913 1.33333 5.92172 1.75476 5.17157 2.50491C4.42143 3.25505 4 4.27247 4 5.33333C4 10 2 11.3333 2 11.3333H14C14 11.3333 12 10 12 5.33333Z"
        [attr.stroke]="color"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"/>
      <path
        d="M9.15332 14C9.03607 14.2021 8.86741 14.3698 8.66461 14.4864C8.46181 14.603 8.23238 14.6643 7.99916 14.6643C7.76593 14.6643 7.5365 14.603 7.3337 14.4864C7.1309 14.3698 6.96224 14.2021 6.84499 14"
        [attr.stroke]="color"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"/>
    </svg>
  `
})
export class IconBellComponent {
  @Input() size: number = 24;
  @Input() color: string = 'currentColor';
}
