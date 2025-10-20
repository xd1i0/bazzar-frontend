import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 19H2V13.8086C3.9905 15.7373 7.27822 17 11 17C14.7218 17 18.0095 15.7373 20 13.8086V19Z" [attr.fill]="color"/>
      <path d="M11 0C17.0751 0 22 3.35786 22 7.5C22 11.6421 17.0751 15 11 15C4.92487 15 0 11.6421 0 7.5C0 3.35786 4.92487 0 11 0ZM11 2.5C8.39862 2.5 6.1538 3.22366 4.62988 4.2627C3.09358 5.31031 2.5 6.49883 2.5 7.5C2.5 8.50117 3.09358 9.68969 4.62988 10.7373C6.1538 11.7763 8.39862 12.5 11 12.5C13.6014 12.5 15.8462 11.7763 17.3701 10.7373C18.9064 9.68969 19.5 8.50117 19.5 7.5C19.5 6.49883 18.9064 5.31031 17.3701 4.2627C15.8462 3.22366 13.6014 2.5 11 2.5Z" [attr.fill]="color"/>
    </svg>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class IconHomeComponent {
  @Input() size: number = 24;
  @Input() color: string = 'currentColor';
}
