import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ElementRef
} from '@angular/core';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { filter, Subscription } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { WallService } from '../../services/wallservice/wall.service';
import { NgxMaterialTimepickerComponent, NgxMaterialTimepickerModule, NgxMaterialTimepickerTheme } from 'ngx-material-timepicker';
import { AddUserComponent } from '../data-transformation/add-user/add-user.component';
import { format } from 'date-fns';
import { AddDomainComponent } from '../data-transformation/add-domain/add-domain.component';
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxMaterialTimepickerModule,
    AddUserComponent,
    AddDomainComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  animations: [
    trigger('fadeInAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('300ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class SettingsComponent implements OnInit, OnDestroy {

  wallDetailsSubscription!: Subscription;
  openingDateSub!: Subscription;
  closingDateSub!: Subscription;
  wall: any;
  originalWallData: any;
  wallId!: string;
  wallForm: FormGroup;
  @Output() closeModal = new EventEmitter<void>();
  minDate: Date = new Date();
  maxDate: Date | undefined;
  closeMinDate: any;
  minTime: string = "12:00 AM";
  maxTime: string = "";
  closeMinTime: string = "12:00 AM";
  @ViewChild('picker1') picker1!: NgxMaterialTimepickerComponent;
  @ViewChild('picker2') picker2!: NgxMaterialTimepickerComponent;
  @ViewChild('openingCalendar') openingCalendar!: ElementRef<HTMLInputElement>;
  @ViewChild('closingCalendar') closingCalendar!: ElementRef<HTMLInputElement>;
  customTheme: NgxMaterialTimepickerTheme = {
    container: {
      bodyBackgroundColor: 'white',
      buttonColor: 'rgb(42, 175, 145)'
    },
    dial: {
      dialBackgroundColor: "rgba(92, 121, 204, 0.8)"
    },
    clockFace: {
      clockHandColor: 'rgb(149, 118, 233)',
      clockFaceTimeInactiveColor: '#373558',
      clockFaceTimeActiveColor: '#f44336'
    }
  };
  constructor(
    private fb: FormBuilder,
    private sharedDataService: SharedDataService,
    private wallService: WallService,
    private cdr: ChangeDetectorRef
  ) {
    this.wallForm = this.fb.group({
      isLocked: false,
      duration: false,
      anyoneCanView: false,
      anyoneCanPost: false,
      isMaintainer: false,
      viewByEmail: false,
      viewByDomain: false,
      postByEmail: false,
      postByDomain: false,
      viewAccess: {
        emails: [],
        domains: []
      },
      postAccess: {
        emails: [],
        domains: []
      },
      maintainerEmails: [],
      openingDate: new FormControl(),
      closingDate: new FormControl(),
      openDate: new FormControl(),
      closeDate: new FormControl()
    });
  }

  ngOnDestroy(): void {
    if (this.wallDetailsSubscription) {
      this.wallDetailsSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.fetchWallDetails();
    this.watchDateChanges();
  }

  closeSidebar(): void {
    if (this.openingDateSub) {
      this.openingDateSub.unsubscribe();
    }
    if (this.closingDateSub) {
      this.closingDateSub.unsubscribe();
    }
    this.sharedDataService.setWallDetails(this.originalWallData);
    this.closeModal.emit();
  }


  fetchWallDetails() {
    this.wallDetailsSubscription = this.sharedDataService.getWallDetails().pipe(
      filter(wallData => !!wallData)).subscribe({
        next: (wallData: any) => {
          this.originalWallData = JSON.parse(JSON.stringify(wallData));
          this.wall = wallData;
          this.wallId = wallData._id;
          this.wallForm.patchValue({
            isLocked: !wallData.isOpen,
            duration: !!(wallData.openDate || wallData.closeDate),
            anyoneCanView: wallData.anyoneCanView,
            anyoneCanPost: wallData.anyoneCanPost,
            viewByEmail: wallData.viewAccess?.emails?.length > 0,
            viewByDomain: wallData.viewAccess?.domains?.length > 0,
            postByEmail: wallData.postAccess?.emails?.length > 0,
            postByDomain: wallData.postAccess?.domains?.length > 0,
            viewAccess: wallData.viewAccess ?? { emails: [], domains: [] },
            postAccess: wallData.postAccess ?? { emails: [], domains: [] },
            isMaintainer: wallData.maintainerEmails.length > 0,
            maintainerEmails: wallData.maintainerEmails,
            openDate: this.convertIsoToCustomFormat(wallData.openDate),
            openingDate: this.convertIsoToCustomFormat(wallData.openDate)?.date,
            closeDate: this.convertIsoToCustomFormat(wallData.closeDate),
            closingDate: this.convertIsoToCustomFormat(wallData.closeDate)?.date
          });
          this.setMinTimeToCurrent();
        },
        error: (err) => {
          return;
        }
      });
  }


  toggleProperty(event: Event, property:'isLocked' | 'anyoneCanView' | 'anyoneCanPost' | 'duration'): void {
    const input = event.target as HTMLInputElement;
    const anyoneCanPost = this.wallForm.get('anyoneCanPost')?.value;
    if (property === 'anyoneCanView' && anyoneCanPost) {
      event.preventDefault();
      input.checked = false;
      this.wallForm.get('anyoneCanView')?.setValue(false, { emitEvent: false });
      return;
    }

    this.wallForm.get(property)?.setValue(input.checked);
    if (property === 'duration' && !input.checked) {
      this.wallForm.patchValue({
        openDate: null,
        closeDate: null,
        openingDate: null,
        closingDate: null
      }, { emitEvent: false });
    }

    if (property === 'anyoneCanPost') {
      if (input.checked) {
        this.wallForm.get('anyoneCanView')?.setValue(false, { emitEvent: false });
        this.wallForm.get('anyoneCanView')?.disable();
      } else {
        this.wallForm.get('anyoneCanView')?.enable();
      }
    }
  }

  getFormControlValue(controlName: string): any {
    return this.wallForm.get(controlName)?.value;
  }

  updateSettings() {
    if(!this.isFormValueChanged()){
      return;
    }

    if (this.openingDateSub) {
      this.openingDateSub.unsubscribe();
    }
    if (this.closingDateSub) {
      this.closingDateSub.unsubscribe();
    }
   
    const updateWallSettings: any = {
      isOpen: !this.getFormControlValue('isLocked'),
      anyoneCanView: this.getFormControlValue('anyoneCanView'),
      anyoneCanPost: this.getFormControlValue('anyoneCanPost'),
      viewAccess: this.getFormControlValue('viewAccess'),
      postAccess: this.getFormControlValue('postAccess'),
      maintainerEmails: this.getFormControlValue('maintainerEmails'),
    };
  
    const openDate = this.wallForm.get('openDate')?.value;
    const closeDate = this.wallForm.get('closeDate')?.value;

    if (!this.getFormControlValue('duration')) {
      updateWallSettings.openDate = null;
      updateWallSettings.closeDate = null;
    } else {
      if (openDate && openDate.date && openDate.time) {
        updateWallSettings.openDate = this.convertCustomToIsoFormat(openDate.date, openDate.time);
      }

      if (closeDate && closeDate.date && closeDate.time) {
        updateWallSettings.closeDate = this.convertCustomToIsoFormat(closeDate.date, closeDate.time);
      }
    }

    this.wallService.updateWall(this.wallId, updateWallSettings).subscribe({
      next: (response) => {
        this.originalWallData = JSON.parse(JSON.stringify(response));
        this.sharedDataService.setWallDetails(response);
        this.closeModal.emit();
      },
      error: (err) => {
        console.error(`Error updating`, err);
      },
    });
  }


  selectTime(event: string, type: string) {
    this.updateCombinedDateTime(event, type);
  }

  selectDate(dateType: string) {
    if (dateType === 'openDate') {
      this.picker1?.open();
    }
    else {
      this.picker2?.open();
    }
  }

  openCalendar(dateType: string) {
    const input = dateType === 'openDate'
      ? this.openingCalendar?.nativeElement
      : this.closingCalendar?.nativeElement;
    input?.showPicker?.();
    input?.focus();
    input?.click();
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

  onDateInputChange(event: Event, controlName: 'openingDate' | 'closingDate'): void {
    const input = event.target as HTMLInputElement;
    this.wallForm.get(controlName)?.setValue(input.value ? new Date(`${input.value}T00:00:00`) : null);
  }

  updateCombinedDateTime(time: any, dateType: string) {
    let date;
    if (dateType === 'openDate') {
      date = new Date(this.getFormControlValue('openingDate'));
      this.closeMinDate = date;
      this.closeMinTime = time;
    }
    else {
      date = new Date(this.getFormControlValue('closingDate'));
      this.maxDate = date;
    }
    this.wallForm.get(dateType)?.setValue({ date, time }, { emitEvent: false });
  }

  formatDate(dateType: string): string {
    let dateValue;
    if (dateType === 'openDate') {
      dateValue = this.wallForm.get('openDate')?.value;
    }
    else {
      dateValue = this.wallForm.get('closeDate')?.value;
    }

    if (dateValue) {
      const { date, time } = dateValue;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year} , ${time}`;
    }
    return "";
  }

  handleEmailsChanged(emails: string[], type: 'view' | 'post' | 'maintainer'): void {
    const postDomains = this.wallForm.get('postAccess')?.value.domains;
    const viewDomains = this.wallForm.get('viewAccess')?.value.domains;
    let postEmails = this.wallForm.get('postAccess')?.value.emails;
    let viewEmails =this.wallForm.get('viewAccess')?.value.emails;
    switch (type) {
      case 'view':
        this.wallForm.get('viewAccess')?.patchValue({ domains: viewDomains, emails: emails });
        break;
      case 'post': emails.forEach((email) => {
        viewEmails = viewEmails.filter((vEmail: string) => vEmail !== email);
      })
        this.wallForm.get('viewAccess')?.patchValue({ domains: viewDomains, emails: viewEmails });
        this.wallForm.get('postAccess')?.patchValue({ domains: postDomains, emails: emails });
        break;
      case 'maintainer':
        emails.forEach((email) => {
          viewEmails = viewEmails.filter((vEmail: string) => vEmail !== email);
          postEmails = postEmails.filter((pEmail: string) => pEmail !== email);
        });
        this.wallForm.get('viewAccess')?.patchValue({ domains: viewDomains, emails: viewEmails });
        this.wallForm.get('postAccess')?.patchValue({ domains: postDomains, emails: postEmails });

        this.wallForm.get('maintainerEmails')?.setValue(emails);
        break;
    }
  }

  handleDomainsChanged(domains: string[], type: 'view' | 'post') {

    const postDomains = this.wallForm.get('postAccess')?.value.domains;
    let viewDomains = this.wallForm.get('viewAccess')?.value.domains;
    const postEmails = this.wallForm.get('postAccess')?.value.emails;
    const viewEmails =this.wallForm.get('viewAccess')?.value.emails;
    switch (type) {
      case 'view':
        const filteredViewEmails = viewEmails.filter((email: string) => {
          const emailDomain = email.split('@')[1];
          return !viewDomains.includes(emailDomain) && !postDomains.includes(emailDomain);
        });

        this.wallForm.get('viewAccess')?.patchValue({ domains: domains, emails: filteredViewEmails });
        break;
      case 'post':
        domains.forEach((domain) => {
          viewDomains = viewDomains.filter((vDomain: string) => vDomain !== domain);
        })
        const filteredPostEmails = postEmails.filter((email: string) => {
          const emailDomain = email.split('@')[1];
          return !postDomains.includes(emailDomain);
        });
        this.wallForm.get('viewAccess')?.patchValue({ domains: viewDomains, emails: viewEmails });
        this.wallForm.get('postAccess')?.patchValue({ domains: domains, emails: filteredPostEmails });
        break;
    }
  }

  getEmailsToBeExcluded(type: 'post' | 'view'): string[] {
    const maintainerEmails = this.wallForm.get('maintainerEmails')?.value || [];
    const postEmails = this.getFormControlValue('postAccess').emails;
    if (type === 'view') {
      return [...maintainerEmails, ...postEmails]
    }
    else {
      return [...maintainerEmails]
    }
  }

  getDomainsToBeExcluded(type: 'post' | 'view'): string[] {
    const postDomains = this.getFormControlValue('postAccess').domains;
    const viewDomains = this.getFormControlValue('viewAccess').domains;
    if (type === 'view') {
      return [...viewDomains, ...postDomains]
    }
    else {
      return [...postDomains]
    }
  }

  watchDateChanges() {
    this.openingDateSub = this.wallForm.get('openingDate')?.valueChanges?.subscribe(selectedDate => {
      this.updateMinTime(selectedDate);
      this.selectDate('openDate');
    }) || new Subscription();

    this.closingDateSub = this.wallForm.get('closingDate')?.valueChanges?.subscribe(selectedDate => {
      this.updateCloseMinTime(selectedDate);
      this.selectDate('closeDate');
    }) || new Subscription();

  }

  setMinTimeToCurrent() {
    const now = new Date();
    this.minTime = format(now, 'hh:mm aa');
    if (this.convertIsoToCustomFormat(this.wall.closeDate)?.date)
      this.maxDate = this.convertIsoToCustomFormat(this.wall.closeDate)?.date
    if (this.convertIsoToCustomFormat(this.wall.closeDate)?.date)
      this.closeMinDate = this.convertIsoToCustomFormat(this.wall.openDate)?.date
    else
      this.closeMinDate = now;
  }

  updateMinTime(selectedDate: Date) {
    const today = new Date();
    const closingdate = new Date(this.getFormControlValue('closingDate'));
    if (!isNaN(closingdate.getTime()) && closingdate.getDate() === selectedDate.getDate()) {
      this.maxTime = this.wallForm.get('closeDate')?.value.time;
    }
    else
      this.maxTime = '23:59';
    if (selectedDate && today.getDate() == selectedDate.getDate()) {
      this.setMinTimeToCurrent();
    } else {
      this.minTime = '12:00 AM';
    }
    this.cdr.detectChanges();
  }

  updateCloseMinTime(selectedDate: Date) {
    const date = new Date(this.getFormControlValue('openingDate'));
    if (isNaN(date.getTime())) {
      this.closeMinTime = this.minTime;
    }
    else if (selectedDate && date.getDate() == selectedDate.getDate()) {
      this.closeMinTime = this.wallForm.get('openDate')?.value.time;
    } else {
      this.closeMinTime = '12:00 AM';
    }
    this.cdr.detectChanges();
  }


  convertIsoToCustomFormat(isoDateString: string): { date: Date, time: string } | null {
    if (!isoDateString) {
      return null;
    }
    try {
      const dateObj = new Date(isoDateString);
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const time = `${(hours % 12) || 12}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
      return {
        date: dateObj,
        time
      };
    } catch (error) {
      return null;
    }
  }


  convertCustomToIsoFormat(date: any, time: string): string | null {
    if (!date || !time) {
      return null;
    }

    try {
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) {
        hours += 12;
      }
      if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }
      const dateObj = new Date(date);
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      return dateObj.toISOString();
    } catch (error) {
      return null;
    }
  }

  isFormValueChanged(): boolean {
    const keysToCompare = ['anyoneCanPost', 'anyoneCanView', 'isOpen', 'maintainerEmails', 'postAccess', 'viewAccess', 'openDate','closeDate'];
  
    const areDatesEqual = (originalDate: any, formDate: any): boolean => {
      if (!originalDate && !formDate) return true;
      if (!originalDate || !formDate) return false;
  
      return (
        originalDate.date?.toISOString() === formDate.date?.toISOString() &&
        originalDate.time === formDate.time
      );
    };
  
    const areObjectsEqual = (obj1: any, obj2: any): boolean => {
      if (obj1 === obj2) return true;
      if ( typeof obj1 !== 'object' ||
           typeof obj2 !== 'object' ||
           obj1 === null || obj2 === null
      ) { return false; }
  
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (keys1.length !== keys2.length) return false;
  
      for (const key of keys1) {
        if (!areObjectsEqual(obj1[key], obj2[key])) return false;
      }
  
      return true;
    };
  
    for (const key of keysToCompare) {
      let originalValue = this.originalWallData[key];
      let formValue;
  
      if (key === 'isOpen') {
        const isLocked = this.wallForm.get('isLocked')?.value;
        if (typeof isLocked !== 'boolean') {
          console.error(`isLocked is not a boolean value:`, isLocked);
          return true;
        }
        formValue = !isLocked;
        if (originalValue !== formValue) {
          return true;
        }
      } else if (key === 'openDate' || key === 'closeDate') {
        originalValue = this.convertIsoToCustomFormat(originalValue);
        formValue = this.wallForm.get(key)?.value;
  
        if (!originalValue && !formValue) { continue; }
        if (!originalValue || !formValue) { return true; }
  
        if (!areDatesEqual(originalValue, formValue)) {
          return true;
        }
      } else {
        formValue = this.wallForm.get(key)?.value;
  
        if (!areObjectsEqual(originalValue, formValue)) {
          return true;
        }
      }
    }
    return false;
  }
}
