import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/authservice/auth.service';
import { FormsModule } from '@angular/forms';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { NgxMaterialTimepickerComponent, NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { filter, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MailService } from '../../services/mailservice/mail.service';
import { UserReplacerComponent } from '../data-transformation/user-replacer/user-replacer.component';
import { AddUserComponent } from '../data-transformation/add-user/add-user.component';
import { format } from 'date-fns';
import { WallService } from '../../services/wallservice/wall.service';

@Component({
  selector: 'app-schedule-delivery',
  standalone: true,
  templateUrl: './schedule-delivery.component.html',
  styleUrl: './schedule-delivery.component.css',
  imports: [
    CommonModule,
    FormsModule,
    AddUserComponent,
    NgxMaterialTimepickerModule,
    UserReplacerComponent
  ]
})
export class ScheduleDeliveryComponent implements OnInit {
  email = this.authService.getEmail();
  scheduledEmails = [] as any[];
  scheduledDate: Date | null = null;
  cc: boolean = true;
  editMails: boolean = false;
  receivedMail: boolean = false;
  tomorrow!: Date;
  thisEvening!: Date;
  mondayMorning!: Date;
  emailId: string[] = [];
  emailInCC: string[] = []
  @ViewChild('picker') picker!: NgxMaterialTimepickerComponent;
  @ViewChild('scheduleCalendar') scheduleCalendar!: ElementRef<HTMLInputElement>;
  mailToBeScheduledDate:  Date | null = null;
  wallId: string = '';
  wall: any;
  minDate: Date = new Date();
  time: string = '';
  date: Date = new Date();
  displayDateTime!: string;
  datesEdit: boolean = false;
  isModified: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  minTime: string = '12:00 AM';
  remove: string = '';

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
    this.mailService.getScheduleEmailsByWallId(this.wallId).subscribe((data)=>{
      if(data){
        this.scheduledEmails = data.recipients?.primary ?? data.emailId?.primary ?? [];
        const rawDate = data.scheduledAt ?? data.scheduledDate;
        this.scheduledDate = rawDate ? new Date(rawDate) : null;
        if(this.scheduledDate){
          this.date = new Date(this.scheduledDate);
          this.time = this.scheduledDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
        const ccList = data.recipients?.cc ?? data.emailId?.cc ?? [];
        if(ccList.length > 0){
          this.cc = true;
        }
        this.delivered();
      }
    })
  }

  editScheduled(){
    this.isModified = false;
    this.editMails = !this.editMails;
    this.emailId = this.scheduledEmails;
    if(this.scheduledDate){
      const schDate = new Date(this.scheduledDate);

      if(schDate!==this.tomorrow && schDate!==this.mondayMorning && schDate!==this.thisEvening){
        const formattedDate = schDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        const formattedTime = schDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        this.mailToBeScheduledDate = this.scheduledDate;
        this.displayDateTime = `${formattedDate}, ${formattedTime}`
      }
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
    if(this.displayDateTime){
      this.displayDateTime = '';
    }
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
      }, error: (err)=>{
        this.toastr.error(err.error.message)
      }
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
      },error:(err)=>{
        this.toastr.error(err.error.message)
      }
    })
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData),take(1)).subscribe({
        next: (wallData: any) => {
          this.wall = wallData;
          this.emailInCC.push(wallData.ownerEmail)
          if(wallData.maintainerEmails.length>0){
            this.emailInCC.push(...wallData.maintainerEmails);
          }
          this.wallId = wallData._id;
          this.getScheduledMails();
        },
        error: (err) => {
          this.router.navigateByUrl('error');
          return;
        }
      });
  }

  onRadioChange(event: any) {
    this.cc = event.target.checked;
    if(this.editMails){
      this.isModified = true;
    }
  }

  scheduleDateSelect() {
    this.updateMinTime(this.date)
    if (this.picker) {
      this.picker.open();
    }
  }

  updateMinTime(selectedDate: Date) {
    const today = new Date();
    if (selectedDate && today.getDate() == selectedDate.getDate()) {
      this.minTime = format(today, 'hh:mm aa');
    } else {
      this.minTime = '12:00 AM';
    }
    this.cdr.detectChanges();
  }

  openCalendar() {
    const input = this.scheduleCalendar?.nativeElement;
    input?.showPicker?.();
    input?.focus();
    input?.click();
  }

  get dateInputValue(): string {
    return this.toDateInputValue(this.date) ?? '';
  }

  toDateInputValue(date: Date | null | undefined): string | null {
    if (!date) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onScheduleDateInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.date = input.value ? new Date(`${input.value}T00:00:00`) : new Date();
    this.scheduleDateSelect();
  }

  /**
   * Checks whether the logged in user is also the creator of the current wall
   * @param none
   * @returns Boolean
   */
  checkWallCreator(): boolean {
    if (
      this.wall &&
      this.wall.ownerEmail === this.email
    ) {
      return true;
    }
    return false;
  }

  parseTime(time: string): Date {
    const [timePart, ampm] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  closeSidebar(): void {
    this.closeModal.emit();
  }

  scheduleTimeSelect(event: string) {
    this.time = event;
    this.updateCombinedDateTime();
  }

  updateCombinedDateTime() {
    if (this.date && this.time) {
      const date = new Date(this.date);
      const time = this.time;
      this.mailToBeScheduledDate = this.combineDateTime(date, time);
      this.datesEdit = false;
      this.isModified = true;
      this.displayDateTime = this.formatDate(date,time);
      if(!this.scheduledDate){
        this.scheduledDate = this.mailToBeScheduledDate;
      }
    }
  }

  toggleEditDates(){
    this.datesEdit = !this.datesEdit
  }

  formatDate(date: Date, time: string): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} , ${time}`;
  }

  combineDateTime(date: Date, time: string): Date {
    const parsedTime = this.parseTime(time);
    const combinedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parsedTime.getHours(), parsedTime.getMinutes());
    return combinedDate;
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
          this.displayDateTime = '';
          this.mailToBeScheduledDate = this.tomorrow;
        }
        this.updateWallDetails()
      },
      error: (err) =>{
        this.toastr.error(err.error.message);
      }
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
        this.displayDateTime = '';
      }
    })
  }
}
