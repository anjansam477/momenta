import { DatePipe } from '@angular/common';
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authservice/auth.service';
import { Wall } from '../../shared/models';
import { FormsModule } from '@angular/forms';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { filter, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MailService, ScheduledMailData } from '../../services/mailservice/mail.service';
import { UserReplacerComponent } from '../data-transformation/user-replacer/user-replacer.component';
import { AccessEditorComponent } from '../data-transformation/access-editor/access-editor.component';
import { WallService } from '../../services/wallservice/wall.service';
import { handleHttpError } from '../../utils/error-handler.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-schedule-delivery',
  standalone: true,
  templateUrl: './schedule-delivery.component.html',
  styleUrl: './schedule-delivery.component.css',
  imports: [
    DatePipe,
    FormsModule,
    AccessEditorComponent,
    UserReplacerComponent
  ]
})
export class ScheduleDeliveryComponent implements OnInit {
  email = this.authService.getEmail();
  scheduledEmails: string[] = [];
  scheduledDate: Date | null = null;
  cc = true;
  editMails = false;
  receivedMail = false;
  tomorrow!: Date;
  thisEvening!: Date;
  mondayMorning!: Date;
  emailId: string[] = [];
  emailInCC: string[] = []
  mailToBeScheduledDate:  Date | null = null;
  wallId = '';
  wall!: Wall;
  minDate: Date = new Date();
  date: Date = new Date();
  /** Value bound to the native datetime-local input (local time, "YYYY-MM-DDTHH:mm"). */
  customDateStr = '';
  isModified = false;
  @Output() closeModal = new EventEmitter<void>();
  remove = '';

  /** Lower bound for the custom picker — now, in local time. */
  get nowStr(): string {
    return this.isoToLocal(new Date());
  }

  /** Format a date as the local-time string a datetime-local input expects. */
  private isoToLocal(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  constructor(
    private authService: AuthService,
    private sharedService: SharedDataService,
    private router: Router,
    private toastr: ToastrService,
    private mailService: MailService,
    private cdr: ChangeDetectorRef,
    private wallService: WallService
  ) { }

  ngOnInit(): void {
    this.fetchWallDetails();
    this.calculateDates();
    this.mailToBeScheduledDate = this.tomorrow
  }

  getScheduledMails(){
    this.mailService.getScheduleEmailsByWallId(this.wallId).subscribe((data: ScheduledMailData)=>{
      if(data){
        this.scheduledEmails = data.recipients?.primary ?? data.emailId?.primary ?? [];
        const rawDate = data.scheduledAt ?? data.scheduledDate;
        this.scheduledDate = rawDate ? new Date(rawDate) : null;
        if(this.scheduledDate){
          this.date = new Date(this.scheduledDate);
        }
        const ccList = data.recipients?.cc ?? data.emailId?.cc ?? [];
        if(ccList.length > 0){
          this.cc = true;
        }
        this.delivered();
        this.cdr.markForCheck();
      }
    })
  }

  editScheduled(){
    this.isModified = false;
    this.editMails = !this.editMails;
    this.emailId = this.scheduledEmails;
    if(this.scheduledDate){
      const schDate = new Date(this.scheduledDate);
      this.mailToBeScheduledDate = schDate;
      // If it isn't one of the quick presets, surface it in the custom picker.
      const isPreset = [this.tomorrow, this.thisEvening, this.mondayMorning]
        .some(d => d.getTime() === schDate.getTime());
      this.customDateStr = isPreset ? '' : this.isoToLocal(schDate);
    }
  }

  delivered(){
    if(this.scheduledDate && new Date(this.scheduledDate)<new Date()){
      this.receivedMail = true;
    }
    else{
      this.receivedMail=false;
    }
  }

  private calculateDates(): void {
    this.tomorrow = new Date();
    this.tomorrow.setDate(this.tomorrow.getDate() + 1);
    this.tomorrow.setHours(8, 0, 0, 0);

    this.thisEvening = new Date();
    this.thisEvening.setHours(20, 0, 0, 0);

    this.mondayMorning = new Date();
    const day = this.mondayMorning.getDay();
    const nextMonday = day === 0 ? 1 : 8 - day;
    this.mondayMorning.setDate(this.mondayMorning.getDate() + nextMonday);
    this.mondayMorning.setHours(8, 0, 0, 0);
  }

  select(data: Date){
    this.isModified = true;
    if(this.scheduledDate && new Date(this.scheduledDate)?.getTime() == data.getTime()){
      this.isModified = false;
      this.mailToBeScheduledDate = new Date(this.scheduledDate)
    }else{
      this.mailToBeScheduledDate = data;
    }
    // Picking a preset clears any custom value so only one is active.
    this.customDateStr = '';
  }

  /** Native datetime-local picker — sets the exact local date & time chosen. */
  onCustomDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.customDateStr = value;
    this.mailToBeScheduledDate = value ? new Date(value) : null;
    this.isModified = true;
  }

  isDateActive(date: Date): boolean {
    if (this.mailToBeScheduledDate) {
      return new Date(this.mailToBeScheduledDate)?.getTime() === date.getTime();
    }
  
    if (this.scheduledDate) {
      const schDate = new Date(this.scheduledDate);
      return schDate.getTime() === date.getTime();
    }
    return false;
  }

  sendMail() {
    if(!this.mailToBeScheduledDate){
      this.toastr.error("No date selected")
    }
    if(this.emailId.length>0 || this.scheduledEmails.length>0){
      const scheduler = {
        primary: this.emailId as string[],
        wallId: this.wallId as string,
        scheduledDate: this.mailToBeScheduledDate as Date,
        cc: [] as string[],
        userEmail: this.email,
        type: "SCHEDULE"
      };
  
      if(this.cc){
        scheduler.cc = this.emailInCC;
      }
  
      this.mailService.scheduleMail(scheduler).subscribe({
        next: (data) => {
        this.sharedService.setMessage('mail');
        this.updateWallDetails()
        this.getScheduledMails();
        if(this.editMails){
          this.editScheduled();
          this.mailToBeScheduledDate = null;
        }
      }, error: (err) => handleHttpError(err, this.toastr)
      });
    }
    else{
      this.toastr.error("No email selected")
    }
  }

  updateWallDetails(){
    let receivers = this.emailId;
    if(this.remove){
      receivers = this.scheduledEmails;
      this.remove = '';
    }else if(this.emailId.length<=0 && this.editMails){
      receivers = []
    }
    this.wallService.updateWall(this.wallId, {receivers: receivers}).subscribe({
      next: (data)=>{
        this.sharedService.setWallDetails(data);
      }, error: (err) => handleHttpError(err, this.toastr)
    })
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData),take(1)).subscribe({
        next: (wallData: Wall) => {
          this.wall = wallData;
          this.emailInCC.push(wallData.ownerEmail)
          if((wallData.maintainerEmails?.length ?? 0) > 0){
            this.emailInCC.push(...(wallData.maintainerEmails ?? []));
          }
          this.wallId = wallData._id;
          this.getScheduledMails();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.router.navigateByUrl('error');
          return;
        }
      });
  }

  onRadioChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.cc = target.checked;
    if(this.editMails){
      this.isModified = true;
    }
  }

  checkWallCreator(): boolean {
    return !!this.wall && this.wall.ownerEmail === this.email;
  }

  closeSidebar(): void {
    this.closeModal.emit();
  }

  handleEmailsChanged(emails: string[]): void {
    this.emailId = emails;
    const set1 = new Set(emails);
    const set2 = new Set(this.scheduledEmails);
  
    const emailsChanged = [...set1].filter(x => !set2.has(x)).length > 0 || [...set2].filter(x => !set1.has(x)).length > 0;
  
    if (emailsChanged) {
      this.isModified = true;
      if (this.mailToBeScheduledDate) {
        this.mailToBeScheduledDate = this.mailToBeScheduledDate;
      } else {
        this.mailToBeScheduledDate = this.scheduledDate;
      }
    } else {
      if (this.scheduledDate) {
        const schDate = new Date(this.scheduledDate).getTime();
        const mailDate = this.mailToBeScheduledDate ? new Date(this.mailToBeScheduledDate).getTime() : null;
  
        if (mailDate !== null && schDate !== mailDate) {
          this.mailToBeScheduledDate = this.mailToBeScheduledDate;
        } else {
          this.mailToBeScheduledDate = null;
        }
      } else {
        this.mailToBeScheduledDate = null;
      }
    }
  }

  close(){
    if(this.editMails){
      this.mailToBeScheduledDate = null;
      this.emailId = this.scheduledEmails;
      this.editMails = false;
    }
    else{
      this.closeSidebar();
    }
  }
  
  removeRecipient(email: string){
    this.remove = email;
    this.mailService.removeRecipient(this.wallId, email).subscribe({
      next: (data)=>{
        this.scheduledEmails = this.scheduledEmails.filter(schemail=> schemail!== email);
        if(this.editMails && this.scheduledEmails.length==0){
          this.editMails = false;
        }
        if(this.scheduledEmails.length===0){
          this.scheduledDate = null;
          this.customDateStr = '';
          this.mailToBeScheduledDate = this.tomorrow;
        }
        this.updateWallDetails()
      },
      error: (err) => handleHttpError(err, this.toastr)
    })
  }

  cancelMail(){
    this.mailService.cancelScheduledMail(this.wallId).subscribe({
      next: ()=>{
        this.updateWallDetails(); 
        this.editMails = false;
        this.scheduledEmails = [];
        this.mailToBeScheduledDate = null;
        this.scheduledDate = null;
        this.customDateStr = '';
      }
    })
  }
}
