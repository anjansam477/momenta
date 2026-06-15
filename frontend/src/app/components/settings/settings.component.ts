import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { filter } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { WallService } from '../../services/wallservice/wall.service';
import { Wall } from '../../shared/models';
import { AccessEditorComponent } from '../data-transformation/access-editor/access-editor.component';
import { WALL_STATUS } from '../../constants/wall.constants';
import { ToastrService } from 'ngx-toastr';
import { handleHttpError } from '../../utils/error-handler.util';

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
  openDateStr: FormControl<string>;
  closeDateStr: FormControl<string>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AccessEditorComponent
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
  wall!: Wall;
  originalWallData!: Wall;
  wallId!: string;
  wallForm: FormGroup<WallSettingsForm>;

  @Output() closeModal = new EventEmitter<void>();
  @Output() openAnalytics = new EventEmitter<void>();
  @Input() isCreatorOrMaintainer = false;

  get nowStr(): string {
    return this.isoToLocal(new Date());
  }

  private isoToLocal(iso: string | Date | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  constructor(
    private fb: FormBuilder,
    private sharedDataService: SharedDataService,
    private wallService: WallService,
    private toastr: ToastrService
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
      openDateStr: new FormControl<string>('', { nonNullable: true }),
      closeDateStr: new FormControl<string>('', { nonNullable: true })
    });
  }

  ngOnInit(): void {
    this.fetchWallDetails();
  }

  closeSidebar(): void {
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
            openDateStr: this.isoToLocal(wallData.openDate),
            closeDateStr: this.isoToLocal(wallData.closeDate)
          });
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
        openDateStr: '',
        closeDateStr: ''
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

    const updateWallSettings: Partial<Wall> = {
      status: this.getFormControlValue('isLocked') ? WALL_STATUS.LOCKED : WALL_STATUS.ACTIVE,
      anyoneCanView: this.getFormControlValue('anyoneCanView'),
      anyoneCanPost: this.getFormControlValue('anyoneCanPost'),
      postConfig: { requireApproval: this.getFormControlValue('requireApproval') },
      viewAccess: this.getFormControlValue('viewAccess'),
      postAccess: this.getFormControlValue('postAccess'),
      maintainerEmails: this.getFormControlValue('maintainerEmails'),
    };
  
    const openDateStr = this.getFormControlValue('openDateStr');
    const closeDateStr = this.getFormControlValue('closeDateStr');

    if (!this.getFormControlValue('duration')) {
      updateWallSettings.openDate = null;
      updateWallSettings.closeDate = null;
    } else {
      updateWallSettings.openDate = openDateStr ? new Date(openDateStr).toISOString() : null;
      updateWallSettings.closeDate = closeDateStr ? new Date(closeDateStr).toISOString() : null;
    }

    this.wallService.updateWall(this.wallId, updateWallSettings).subscribe({
      next: (response) => {
        this.originalWallData = JSON.parse(JSON.stringify(response));
        this.sharedDataService.setWallDetails(response);
        this.closeModal.emit();
      },
      error: (err) => {
        handleHttpError(err, this.toastr);
      },
    });
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

  isFormValueChanged(): boolean {
    const keysToCompare = ['anyoneCanPost', 'anyoneCanView', 'isOpen', 'maintainerEmails', 'postAccess', 'viewAccess', 'openDateStr', 'closeDateStr', 'requireApproval'];

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
      } else if (key === 'openDateStr' || key === 'closeDateStr') {
        const wallKey = key === 'openDateStr' ? 'openDate' : 'closeDate';
        const iso = (this.originalWallData as unknown as Record<string, unknown>)[wallKey];
        const originalStr = this.isoToLocal(iso as string | null);
        formValue = this.wallForm.get(key)?.value ?? '';
        if (originalStr !== formValue) return true;
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
