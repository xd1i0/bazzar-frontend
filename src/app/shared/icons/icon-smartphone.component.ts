import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-smartphone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 16 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 0C15.1046 0 16 0.895431 16 2V21C16 22.1046 15.1046 23 14 23H2C0.964349 23 0.113005 22.2128 0.0107422 21.2041L0 21V2C0 0.895431 0.895431 0 2 0H14ZM2 21H14V2H2V21ZM7.64648 8.64648C7.84175 8.45122 8.15825 8.45122 8.35352 8.64648L11.5352 11.8281C11.7304 12.0234 11.7304 12.3399 11.5352 12.5352C11.3399 12.7304 11.0234 12.7304 10.8281 12.5352L8.5 10.207V16H7.5V10.207L5.17188 12.5352C4.97661 12.7304 4.66011 12.7304 4.46484 12.5352C4.26958 12.3399 4.26958 12.0234 4.46484 11.8281L7.64648 8.64648Z"
        [attr.fill]="color"/>
    </svg>
  `,
  styles: [``]
})
export class IconSmartphoneComponent {
  @Input() size: number = 24;
  @Input() color: string = 'currentColor';
}
