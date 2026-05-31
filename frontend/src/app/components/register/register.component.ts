import { Component } from '@angular/core';
import { UserService } from '../../services/userservice/user.service';
import { Router, RouterLink } from '@angular/router';
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
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  authBaseUrl: String = SERVICE_BASE_URL + '/api/auth/google';
  userData!: FormGroup;
  passwordFieldType: string = 'password';
  confirmPasswordFieldType: string = 'password';
  errorMessage:string='';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private sharedService: SharedDataService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.subscribeToFormChanges();
  }

  // added validation for form
  createForm(): void {
    this.userData = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      fname: ['', [Validators.required, noWhitespaceValidator('First name',3,30)]],
      lname: ['', [Validators.required, noWhitespaceValidator('Last name',3,30)]],
      password: [
        '',
        [Validators.required,noWhitespaceValidator('Password',4,20)],
      ]
    });
  }

  // toggle password visibility
  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  /**
   * Creates a new user and saves their data then navigates to login page on success
   */
  onSubmit(): void {
    if(this.userData.valid && this.errorMessage===''){
      const trimmedValues = {
        email: this.userData.value.email.trim().toLowerCase(),
        fname: this.userData.value.fname.trim(),
        lname: this.userData.value.lname.trim(),
        password: this.userData.value.password.trim()
      };
    
      this.userData.patchValue(trimmedValues);
      this.userService.createUser(this.userData.value).subscribe({
        next: () => {
          this.sharedService.setUserEmail(this.userData.value.email);
          this.router.navigate(['/verification/pending']);
          this.sharedService.setMessage("verify")
        },
        error: (err) => {
          this.errorMessage = err.error.message;
        },
      });
    } else{
      this.markAllFieldsAsTouched();
    }
  }
  
  // checking if error in fields and highlight them
  markAllFieldsAsTouched(): void {
    Object.keys(this.userData.controls).forEach(field => {
      const control = this.userData.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  // execute functionality as soon as change in form details
  subscribeToFormChanges(): void {
    this.userData.get('email')?.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });
  }

}
