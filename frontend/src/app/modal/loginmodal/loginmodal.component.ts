import { Component, effect, OnInit } from '@angular/core';
import { UserService } from '../../services/userservice/user.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/authservice/auth.service';
import { SERVICE_BASE_URL } from '../../environment-config';
import { CommonModule } from '@angular/common';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { customEmailValidator } from '../../validators/email-validator';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

@Component({
  selector: 'app-loginmodal',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './loginmodal.component.html',
  styleUrl: './loginmodal.component.css',
})
export class LoginmodalComponent implements OnInit{
  userData = {
    email: '',
    password: '',
  };
  authBaseUrl: String = SERVICE_BASE_URL + '/api/auth/google';
  message: String = '';
  loginForm!: FormGroup;
  passwordFieldType: string = 'password';
  incorrect : boolean = false
  errorMessage:String='';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private sharedService: SharedDataService
  ) {
    effect(() => {
      this.message = this.getMessage(this.sharedService.context());
    });
  }

  ngOnInit(): void {
    this.createForm();
    this.subscribeToFormChanges();
  }

  createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required,noWhitespaceValidator('Password',null,null)]],
    });
  }

  subscribeToFormChanges(): void {
    this.loginForm.valueChanges.subscribe(() => {
      this.incorrect = false;
      this.errorMessage = '';
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  login() {
    if (this.loginForm.valid && this.errorMessage==='') {
      const trimmedEmail = this.loginForm.value.email.trim();
      const trimmedPassword = this.loginForm.value.password.trim();
      this.userService.loginUser({ email: trimmedEmail, password: trimmedPassword }).subscribe({
        next: (res: any) => {
          if (res.token) {
            this.authService.storeToken(res.token);
            this.authService.storeEmail(this.loginForm.value.email);
            this.authService.storeName(res.name);
            this.sharedService.setMessage('login-modal');
            this.incorrect = false;
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            this.loginForm.reset();
          }
        },
        error: (err) => {
          this.errorMessage = err.error.message;
          this.incorrect = true;
        }
      });
    } else {
      this.incorrect = true;
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  getMessage(context: string){
    switch (context) {
      case 'react':
        return "To react on the post, please sign in.";
      case 'report':
        return "To report the post, please sign in.";
      case 'create':
        return "To create a new moment, please sign in.";
      case 'dashboard':
        return "To view the dashboard, please sign in.";
      default:
        return "Please sign in to interact with the moment.";
    }
  }

  close(){
    this.loginForm.reset();
    this.message= '';
    this.userData = {
      email: '',
      password: '',
    };
  }

  googleLogin(){
    this.sharedService.setMessage('login')
  }
}
