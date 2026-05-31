import { Component } from '@angular/core';
import { AuthService } from '../../services/authservice/auth.service';
import { UserService } from '../../services/userservice/user.service';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SERVICE_BASE_URL } from '../../environment-config';
import { CommonModule } from '@angular/common';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';
import { customEmailValidator } from '../../validators/email-validator';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  authBaseUrl: String = SERVICE_BASE_URL + '/api/auth/google';
  loginForm!: FormGroup;
  passwordFieldType: string = 'password';
  incorrect: boolean = false
  errorMessage: String = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private sharedService: SharedDataService,
  ) { }

  ngOnInit(): void {
    this.createForm();
    this.subscribeToFormChanges();
  }

  // added validation for form
  createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, noWhitespaceValidator('Password', null, null)]],
    });
  }

  // execute functionality as soon as change in form details
  subscribeToFormChanges(): void {
    this.loginForm.valueChanges.subscribe(() => {
      this.incorrect = false;
      this.errorMessage = '';
    });
  }

  // toggle password visibility
  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  /**
   * authenticates the user details and logs in the user then navigates to homepage
  */
  login() {
    if (this.loginForm.valid && this.errorMessage === '') {
      const trimmedEmail = this.loginForm.value.email.trim().toLowerCase();
      const trimmedPassword = this.loginForm.value.password.trim();
      this.userService.loginUser({ email: trimmedEmail, password: trimmedPassword }).subscribe({
        next: (res: any) => {
          if (res.token) {
            this.sharedService.setMessage("login");
            this.authService.storeToken(res.token);
            this.authService.storeEmail(trimmedEmail);
            this.authService.storeName(res.name);
            this.router.navigate(['/home']);
            this.incorrect = false;
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

  // checking if error in fields and highlight them
  markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  // just setting the message
  googleLogin() {
    const currentRedirectUrl = new URLSearchParams(window.location.search).get('redirectUrl') || '/home';
    const googleOAuthUrl = `${this.authBaseUrl}?redirectUrl=${encodeURIComponent(currentRedirectUrl)}`;
    window.location.href = googleOAuthUrl;
  }

  // resend verification if not account not verified
  resendVerification() {
    if (this.loginForm.valid) {
      const trimmedEmail = this.loginForm.value.email.trim().toLowerCase();
      this.sharedService.setUserEmail(trimmedEmail);
      this.userService.generateToken({ email: trimmedEmail }).subscribe({
        next: (res: any) => {
          this.router.navigateByUrl('/verification/pending');
        },
        error: (error) => {
          this.errorMessage = error.error.message;
        }
      });
    }
  }
}
