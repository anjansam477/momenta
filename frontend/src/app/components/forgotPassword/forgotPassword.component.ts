import { Component, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/userservice/user.service';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-forgotPassword',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './forgotPassword.component.html',
  styleUrl: './forgotPassword.component.css',
})
export class ForgotPasswordComponent implements OnInit{
  forgotPasswordForm!: FormGroup;
  token: string | null = null;
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  errorMessage:string='';
  
  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private sharedService: SharedDataService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.createForm();
  }

  createForm(): void {
    this.forgotPasswordForm = this.fb.group({
      token: [this.token],
      password: ['', [Validators.required,noWhitespaceValidator('Password',4,20)],],
      confirmpassword: ['', Validators.required],
    });
  }

  /**
   * Checks whether the passwords match or not.
   * @returns boolean
   */
  doPasswordsMatch(): boolean {
      const password = this.forgotPasswordForm.get('password')?.value.trim();
      const confirmpassword = this.forgotPasswordForm.get('confirmpassword')?.value.trim();
      return password === confirmpassword;
    
  }
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  /**
   * Updates the user's account password with the new password they have provided then navigates to login page on success. 
   */
  changePassword() {
    if (this.token === null )
    {
        this.errorMessage='Token has expired. Try again.';
        this.router.navigate(['/login']);

    }
    else if(this.forgotPasswordForm.valid && this.doPasswordsMatch() && this.errorMessage==='') {
      const password = this.forgotPasswordForm.value.password.trim();
      const confirmpassword = this.forgotPasswordForm.value.confirmpassword.trim();
      const userData = { ...this.forgotPasswordForm.value, password, confirmpassword };

      this.userService.updatePassword(userData).subscribe({
        next: (_res: unknown) => {
          this.sharedService.setMessage('password');
          this.router.navigate(['/changed-password']);
          this.errorMessage='';
        },
        error: (error: { status: number; error: { message: string } }) => {
          this.errorMessage=error.error.message;
        },
        complete: () => {
          this.forgotPasswordForm.reset();
        },
      });
    }
  }
}
