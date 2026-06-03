import { Component, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/userservice/user.service';
import { customEmailValidator } from '../../validators/email-validator';
import { Router, RouterLink } from '@angular/router';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { APP_EMAIL } from '../../environment-config';
import { markAllFieldsAsTouched } from '../../utils/form.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-resetPassword',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './resetPassword.component.html',
  styleUrl: './resetPassword.component.css'
})
export class ResetPasswordComponent {
  private readonly destroyRef = inject(DestroyRef);
  resetStatus:boolean=false;
  forgotPasswordForm!: FormGroup;
  errorMessage:string='';
  userEmail:string='';
  constructor(
    private fb : FormBuilder,
    private userService: UserService,
    private router: Router,
    private sharedService: SharedDataService
  ) {}

  closeModal() {
    this.forgotPasswordForm.reset();
  }

  ngOnInit(){
    this.createForm();
    this.subscribeToFormChanges();
    
  }

  createForm(){
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]]
    });
  }

  forgotPassword() {
    if(this.forgotPasswordForm.valid && this.errorMessage===''){
      const trimmedEmail = this.forgotPasswordForm.value.email.trim();
      this.userService.forgotPassword({email: trimmedEmail}).subscribe({
        next: (_res: unknown) => {
          this.resetStatus = true;
          this.userEmail=trimmedEmail;
          this.closeModal();
        },
        error: (error) => {
          this.errorMessage = error.error.message;
          this.resetStatus = false;
        }
      });
    }
    else{
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched(): void {
    markAllFieldsAsTouched(this.forgotPasswordForm);
  }

  redirectToLogin(){
    this.router.navigateByUrl('/login');
  }

  subscribeToFormChanges(): void {
    this.forgotPasswordForm.get('email')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.errorMessage = '';
    });
  }

  resendVerification(){
    if(this.forgotPasswordForm.valid){
      this.sharedService.setUserEmail(this.forgotPasswordForm.value.email);
      const trimmedEmail = this.forgotPasswordForm.value.email.trim();
      this.userService.generateToken({email: trimmedEmail}).subscribe({
        next: (_res: unknown) => {
          this.router.navigateByUrl('/verification/pending');
        },
        error: (error) => {
          this.resetStatus = false;
          this.errorMessage=error.error.message;
        }
      });
    }
  }

  openGmail() {
    if(this.userEmail){
      const url = `https://mail.google.com/mail/u/${this.userEmail}/#search/from:${APP_EMAIL}`;
      window.open(url, '_blank');
    }
    else{
      window.open('https://mail.google.com/', '_blank');
    }
    this.router.navigateByUrl('/login');
  }
}

