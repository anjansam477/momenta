import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MailService } from '../../services/mailservice/mail.service';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contact-us-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-us-modal.component.html',
  styleUrl: './contact-us-modal.component.css'
})
export class ContactUsModalComponent implements OnInit,AfterViewInit{
  private readonly destroyRef = inject(DestroyRef);
  contactForm! : FormGroup;
  @ViewChild('contactUsModal') contactUsModal!: ElementRef;
  isMailSend:boolean=false;
  errorMessage:string='';
  mailProcessing:string='';
  constructor(
    private fb:FormBuilder,
    private mailService:MailService
  ){}

  ngOnInit(): void {
      this.createForm();
      this.subscribeToFormChanges();
  }

  ngAfterViewInit(): void {
    this.contactUsModal.nativeElement.addEventListener('shown.bs.modal', () => {
      this.prefillForm();
    });
  }

  createForm() {
    this.contactForm = this.fb.group({
      email: [{ value: '', disabled: true}, [Validators.required]],
      name: [{ value: '', disabled: true }, Validators.required],
      message: ['',[ Validators.required,noWhitespaceValidator('Message',3,1000)]]
    });
  }

  prefillForm() {
    const storedEmail = localStorage.getItem('email') || '';
    const storedName = localStorage.getItem('name') || '';
    this.contactForm.patchValue({
      email: storedEmail,
      name: storedName
    });
  }

  sendMessage() {
    if (this.contactForm.valid  && this.mailProcessing==="" && this.errorMessage==='') {
      this.mailProcessing="Sending your message, please wait...";
      const formData = {
        email: this.contactForm.get('email')?.value,
        name: this.contactForm.get('name')?.value,
        message: this.contactForm.get('message')?.value
      };
      this.mailService.sendContactEmail(formData).subscribe({
        next: (response) => {
          this.isMailSend=true;
        },
        error: (error) => {
          this.isMailSend = false;
          this.mailProcessing="";
          this.errorMessage=error.error.message;
        }}
      );
    }
  }

  closeModal(){
   this.contactForm.reset();
   this.isMailSend = false;
   this.mailProcessing = "";
    const modalElement = this.contactUsModal.nativeElement as HTMLElement;
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
    const backdropElement = document.getElementsByClassName('modal-backdrop')[0];
    if (backdropElement) {
      backdropElement.parentNode?.removeChild(backdropElement);
    }
  }


  subscribeToFormChanges(): void {
    this.contactForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.errorMessage = '';
    });
  }
}
