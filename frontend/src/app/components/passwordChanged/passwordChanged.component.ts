import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-passwordChanged',
  standalone: true,
  imports: [],
  templateUrl: './passwordChanged.component.html',
  styleUrl: './passwordChanged.component.css'
})
export class PasswordChangedComponent {

  constructor(
    private router: Router,
  ) {}

  redirectToLogin(){
    this.router.navigateByUrl('/login');
  }

}
