import { Component } from '@angular/core';
import { UI_BASE_URL } from '../../environment-config';

@Component({
  selector: 'app-errorpage',
  standalone: true,
  imports: [],
  templateUrl: './errorpage.component.html',
  styleUrl: './errorpage.component.css'
})
export class ErrorpageComponent {
  homeLink: string = '/';
  
  constructor() {
    const urlObj = new URL(UI_BASE_URL);
    const path = urlObj.pathname;

    if (path === '/' || path === '') {
      this.homeLink = '/';
    } else {
      this.homeLink = path;
    }
  }
}
