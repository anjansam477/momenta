import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { filter, Subscription } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { WallService } from '../../services/wallservice/wall.service';
import { Wall } from '../../shared/models';
import { NgxMaterialTimepickerComponent, NgxMaterialTimepickerModule, NgxMaterialTimepickerTheme } from 'ngx-material-timepicker';
import { AddUserComponent } from '../data-transformation/add-user/add-user.component';
import { format } from 'date-fns';
import { AddDomainComponent } from '../data-transformation/add-domain/add-domain.component';
import { WALL_STATUS } from '../../constants/wall.constants';

/** Access list for a wall — emails + domains allowed to view/post. */
interface AccessList {
  emails: string[];
  domains: string[];
}

/** A picked calendar date + a time string like "10:30 AM". */
interface DateTimeValue {
  date: Date;
  time: string;
}

/** Strongly-typed shape of the settings reactive form. */
interface WallSettingsForm {
  isLocked: FormControl<boolean>;
  duration: FormControl<boolean>;
  anyoneCanView: FormControl<boolean>;
  anyoneCanPost: FormControl<boolean>;
  isMaintainer: FormControl<boolean>;
  viewByEmail: FormControl<boolean>;
  viewByDomain: FormControl<boolean>;
  postByEmail: FormControl<boolean>;
  postByDomain: FormControl<boolean>;
  viewAccess: FormControl<AccessList>;
  postAccess: FormControl<AccessList>;
  requireApproval: FormControl<boolean>;
  maintainerEmails: FormControl<string[]>;
  openingDate: FormControl<Date | null>;
  closingDate: FormControl<Date | null>;
  openDate: FormControl<DateTimeValue | null>;
  closeDate: FormControl<DateTimeValue | null>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  standalone: true,
  imports: [
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
export class SettingsComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  openingDateSub!: Subscription;
  closingDateSub!: Subscription;
  wall!: Wall;
  originalWallData!: Wall;
  wallId!: string;
  wallForm: FormGroup<WallSettingsForm>;

  activeViewTab: 'email' | 'domain' = 'email';
  activePostTab: 'email' | 'domain' = 'email';
  @Output() closeModal = new EventEmitter<void>();
  @Output() openAnalytics = new EventEmitter<void>();
  @Input() isCreatorOrMaintainer = false;
  minDate: Date = new Date();
  maxDate: Date | undefined;
  closeMinDate: Date | null = null;
  minTime = "12:00 AM";
  maxTime = "";
  closeMinTime = "12:00 AM";
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
    const bool = (v = false) => new FormControl(v, { nonNullable: true });
    this.wallForm = new FormGroup<WallSettingsForm>({
      isLocked: bool(),
      duration: bool(),
      anyoneCanView: bool(),
      anyoneCanPost: bool(),
      isMaintainer: bool(),
      viewByEmail: bool(),
      viewByDomain: bool(),
      postByEmail: bool(),
      postByDomain: bool(),
      viewAccess: new FormControl<AccessList>({ emails: [], domains: [] }, { nonNullable: true }),
      postAccess: new FormControl<AccessList>({ emails: [], domains: [] }, { nonNullable: true }),
      requireApproval: bool(),
      maintainerEmails: new FormControl<string[]>([], { nonNullable: true }),
      openingDate: new FormControl<Date | null>(null),
      closingDate: new FormControl<Date | null>(null),
      openDate: new FormControl<DateTimeValue | null>(null),
      closeDate: new FormControl<DateTimeValue | null>(null)
    });
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
    this.sharedDataService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (wallData: Wall) => {
          this.originalWallData = JSON.parse(JSON.stringify(wallData));
          this.wall = wallData;
          this.wallId = wallData._id;
          this.wallForm.patchValue({
            isLocked: wallData.status === WALL_STATUS.LOCKED,
            duration: !!(wallData.openDate || wallData.closeDate),
            anyoneCanView: wallData.anyoneCanView ?? false,
            anyoneCanPost: wallData.anyoneCanPost ?? false,
            viewByEmail: (wallData.viewAccess?.emails?.length ?? 0) > 0,
            viewByDomain: (wallData.viewAccess?.domains?.length ?? 0) > 0,
            postByEmail: (wallData.postAccess?.emails?.length ?? 0) > 0,
            postByDomain: (wallData.postAccess?.domains?.length ?? 0) > 0,
            viewAccess: wallData.viewAccess ?? { emails: [], domains: [] },
            postAccess: wallData.postAccess ?? { emails: [], domains: [] },
            requireApproval: wallData.postConfig?.requireApproval ?? false,
            isMaintainer: (wallData.maintainerEmails?.length ?? 0) > 0,
            maintainerEmails: wallData.maintainerEmails ?? [],
            openDate: this.convertIsoToCustomFormat(wallData.openDate),
            openingDate: this.convertIsoToCustomFormat(wallData.openDate)?.date ?? null,
            closeDate: this.convertIsoToCustomFormat(wallData.closeDate),
            closingDate: this.convertIsoToCustomFormat(wallData.closeDate)?.date ?? null
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

  getFormControlValue<K extends keyof WallSettingsForm>(
    controlName: K
  ): WallSettingsForm[K] extends FormControl<infer V> ? V : never {
    return this.wallForm.controls[controlName].value as WallSettingsForm[K] extends FormControl<infer V> ? V : never;
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
   
    const updateWallSettings: Partial<Wall> = {
      status: this.getFormControlValue('isLocked') ? WALL_STATUS.LOCKED : WALL_STATUS.ACTIVE,
      anyoneCanView: this.getFormControlValue('anyoneCanView'),
      anyoneCanPost: this.getFormControlValue('anyoneCanPost'),
      postConfig: { requireApproval: this.getFormControlValue('requireApproval') },
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

  updateCombinedDateTime(time: string, dateType: string) {
    let date;
    if (dateType === 'openDate') {
      date = new Date(this.getFormControlValue('openingDate') ?? 0);
      this.closeMinDate = date;
      this.closeMinTime = time;
    }
    else {
      date = new Date(this.getFormControlValue('closingDate') ?? 0);
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
    const postDomains = this.getFormControlValue('postAccess').domains;
    const viewDomains = this.getFormControlValue('viewAccess').domains;
    let postEmails = this.getFormControlValue('postAccess').emails;
    let viewEmails = this.getFormControlValue('viewAccess').emails;
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

    const postDomains = this.getFormControlValue('postAccess').domains;
    let viewDomains = this.getFormControlValue('viewAccess').domains;
    const postEmails = this.getFormControlValue('postAccess').emails;
    const viewEmails = this.getFormControlValue('viewAccess').emails;
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
    this.openingDateSub = this.wallForm.get('openingDate')?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(selectedDate => {
        this.updateMinTime(selectedDate);
        this.selectDate('openDate');
      }) ?? new Subscription();

    this.closingDateSub = this.wallForm.get('closingDate')?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(selectedDate => {
        this.updateCloseMinTime(selectedDate);
        this.selectDate('closeDate');
      }) ?? new Subscription();
  }

  setMinTimeToCurrent() {
    const now = new Date();
    this.minTime = format(now, 'hh:mm aa');
    if (this.convertIsoToCustomFormat(this.wall.closeDate)?.date)
      this.maxDate = this.convertIsoToCustomFormat(this.wall.closeDate)?.date
    if (this.convertIsoToCustomFormat(this.wall.closeDate)?.date)
      this.closeMinDate = this.convertIsoToCustomFormat(this.wall.openDate)?.date ?? null
    else
      this.closeMinDate = now;
  }

  updateMinTime(selectedDate: Date | null) {
    if (!selectedDate) { return; }
    const today = new Date();
    const closingdate = new Date(this.getFormControlValue('closingDate') ?? 0);
    if (!isNaN(closingdate.getTime()) && closingdate.getDate() === selectedDate.getDate()) {
      this.maxTime = this.getFormControlValue('closeDate')?.time ?? '23:59';
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

  updateCloseMinTime(selectedDate: Date | null) {
    if (!selectedDate) { return; }
    const date = new Date(this.getFormControlValue('openingDate') ?? 0);
    if (isNaN(date.getTime())) {
      this.closeMinTime = this.minTime;
    }
    else if (selectedDate && date.getDate() == selectedDate.getDate()) {
      this.closeMinTime = this.getFormControlValue('openDate')?.time ?? '12:00 AM';
    } else {
      this.closeMinTime = '12:00 AM';
    }
    this.cdr.detectChanges();
  }


  convertIsoToCustomFormat(isoDateString: string | Date | null | undefined): { date: Date, time: string } | null {
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


  convertCustomToIsoFormat(date: Date | string | null | undefined, time: string): string | null {
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
    const keysToCompare = ['anyoneCanPost', 'anyoneCanView', 'isOpen', 'maintainerEmails', 'postAccess', 'viewAccess', 'openDate', 'closeDate', 'requireApproval'];
  
    type DateTimeValue = { date?: Date; time?: string } | null | undefined;
    const areDatesEqual = (originalDate: DateTimeValue, formDate: DateTimeValue): boolean => {
      if (!originalDate && !formDate) return true;
      if (!originalDate || !formDate) return false;

      return (
        originalDate.date?.toISOString() === formDate.date?.toISOString() &&
        originalDate.time === formDate.time
      );
    };
  
    const areObjectsEqual = (obj1: unknown, obj2: unknown): boolean => {
      if (obj1 === obj2) return true;
      if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        return false;
      }
      const o1 = obj1 as Record<string, unknown>;
      const o2 = obj2 as Record<string, unknown>;
      const keys1 = Object.keys(o1);
      const keys2 = Object.keys(o2);
      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (!areObjectsEqual(o1[key], o2[key])) return false;
      }

      return true;
    };
  
    for (const key of keysToCompare) {
      let originalValue = (this.originalWallData as unknown as Record<string, unknown>)[key];
      let formValue;
  
      if (key === 'requireApproval') {
        const originalVal = this.originalWallData.postConfig?.requireApproval ?? false;
        const formVal = this.wallForm.get('requireApproval')?.value ?? false;
        if (originalVal !== formVal) return true;
        continue;
      } else if (key === 'isOpen') {
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
        originalValue = this.convertIsoToCustomFormat(originalValue as string | Date | null);
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
