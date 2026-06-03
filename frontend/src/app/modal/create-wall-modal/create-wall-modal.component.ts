import { NgClass } from '@angular/common';
import { Component, DestroyRef, Input, ViewChild, inject , ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WallService } from '../../services/wallservice/wall.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { MessagemodalComponent } from '../messagemodal/messagemodal.component';
import { markAllFieldsAsTouched } from '../../utils/form.util';
import { handleHttpError } from '../../utils/error-handler.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-create-wall-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-wall-modal.component.html',
  styleUrl: './create-wall-modal.component.css',
})
export class CreateWallModalComponent {
  @Input() occasionSubject: Subject<string> | undefined;
  @Input() titleSubject: Subject<string> | undefined;
  private readonly destroyRef = inject(DestroyRef);
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

    this.occasionSubject?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
      (type: string) => {
        if (type && type.trim() !== '') {
          this.type = type;
          this.createWallForm.patchValue({ type: type });
          this.createWallForm.get('type')?.disable();
        }
      }
    );
    
    this.titleSubject?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
      (title: string) => {
        if (title && title.trim() !== '') {
          this.createWallForm.patchValue({ title: title });
        }
      }
    );

    this.createWallForm.patchValue({ email: this.userEmail ?? '' });
  }

  createForm(): void {
    this.createWallForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      type: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }  

  createWall() {
    if (this.createWallForm.valid) {
      const formValues = this.createWallForm.value;
      const trimmedValues = {
        title: formValues.title.trim(),
        type: this.type || formValues.type.trim(),
        description: formValues.description.trim(),
        ownerEmail: formValues.email.trim(),
      };

      this.wallService.createWall(trimmedValues).subscribe({
        next: (data) => {
          this.sharedService.setMessage('wall');
          this.createWallForm.reset();
          this.router.navigateByUrl(`moment/${data._id}`);
        },
        error: (err) => {
          handleHttpError(err, this.toastr);
          this.createWallForm.reset();
        },
      });
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched(): void {
    markAllFieldsAsTouched(this.createWallForm);
  }

  closeModal() {
    this.createWallForm.reset({
      email: this.createWallForm.get('email')?.value
    });
    this.createWallForm.get('type')?.enable();
  }
}
