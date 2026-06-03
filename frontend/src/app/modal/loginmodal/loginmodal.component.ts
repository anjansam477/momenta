import { Component, DestroyRef, effect, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/userservice/user.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/authservice/auth.service';
import { SERVICE_BASE_URL } from '../../environment-config';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { customEmailValidator } from '../../validators/email-validator';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';
import { markAllFieldsAsTouched } from '../../utils/form.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-loginmodal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './loginmodal.component.html',
  styleUrl: './loginmodal.component.css',
})
export class LoginmodalComponent implements OnInit{
  private readonly destroyRef = inject(DestroyRef);
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
    this.loginForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
        next: (res: { token?: string; name?: string }) => {
          if (res.token) {
            this.authService.storeToken(res.token);
            this.authService.storeEmail(this.loginForm.value.email);
            this.authService.storeName(res.name ?? '');
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
    markAllFieldsAsTouched(this.loginForm);
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
