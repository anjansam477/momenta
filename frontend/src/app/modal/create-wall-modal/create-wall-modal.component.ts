import { Component, Input, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WallService } from '../../services/wallservice/wall.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { MessagemodalComponent } from '../messagemodal/messagemodal.component';

@Component({
  selector: 'app-create-wall-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-wall-modal.component.html',
  styleUrl: './create-wall-modal.component.css',
})
export class CreateWallModalComponent {
  @Input() occasionSubject: Subject<string> | undefined;
  @Input() titleSubject: Subject<string> | undefined;
  occasionSubscription: Subscription | undefined;
  titleSubscription: Subscription | undefined;
  type: string = '';
  userEmail = localStorage.getItem('email');
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;

  createWallForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private wallService: WallService,
    private toastr: ToastrService,
    private sharedService: SharedDataService
  ) {}

  ngOnInit() {
    this.createForm();

    this.occasionSubscription = this.occasionSubject?.subscribe(
      (type: string) => {
        if (type && type.trim() !== '') {
          this.type = type;
          this.createWallForm.patchValue({ type: type });
          this.createWallForm.get('type')?.disable();
        }
      }
    );
    
    this.titleSubscription = this.titleSubject?.subscribe(
      (title: string) => {
        if (title && title.trim() !== '') {
          this.createWallForm.patchValue({ title: title });
        }
      }
    );

    this.createWallForm.patchValue({ email: this.userEmail ?? '' });
  }

  ngOnDestroy() {
    if (this.occasionSubscription) {
      this.occasionSubscription.unsubscribe();
    }

    if (this.titleSubscription) {
      this.titleSubscription.unsubscribe();
    }
  }

  createForm(): void {
    this.createWallForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      type: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }  

  createWall() {
    if (this.createWallForm.valid) {
      const formValues = this.createWallForm.value;
      const trimmedValues = {
        title: formValues.title.trim(),
        type: this.type || formValues.type.trim(),
        description: formValues.description.trim(),
        ownerEmail: formValues.email.trim()
      };

      this.wallService.createWall(trimmedValues).subscribe({
        next: (data) => {
          this.sharedService.setMessage('wall');
          this.createWallForm.reset();
          this.router.navigateByUrl(`moment/${data._id}`);
        },
        error: (error) => {
          this.toastr.error(error.error.message);
          this.createWallForm.reset();
        },
      });
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.createWallForm.controls).forEach(field => {
      const control = this.createWallForm.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  closeModal() {
    this.createWallForm.reset({
      email: this.createWallForm.get('email')?.value
    });
    this.createWallForm.get('type')?.enable();
  }
}
