import { NgClass } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { filter, take } from 'rxjs/operators';
import { UserService } from '../../../services/userservice/user.service';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/authservice/auth.service';
import { TagInputModule } from 'ngx-chips';
import { Observable, of } from 'rxjs';
import { UserDetails } from '../../../shared/models';
import { Wall } from '../../../shared/models';
import { animate, style, transition, trigger } from '@angular/animations';
import { getInitials, convertBufferToBase64 } from '../../../utils/user.util';

type TagModel = string | Record<string, string>;
type UserTagModel = { email: string; name?: string; profilePicture?: string };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-add-user',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, TagInputModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.css',
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
export class AddUserComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  searchForm!: FormGroup;
  selectedUsers: UserDetails[] = [];
  showList = true;
  selectedEmails: string[] = [];
  errorMessage: string = '';
  isChecked: boolean = true;
  @Output() emailsChanged = new EventEmitter<string[]>();
  @Input() component!: string;
  @Input() isDisabled: boolean=false;
  userEmail = this.authService.getEmail();
  @Input() sharedEmails: string[] = [];
  @Input() excludeEmails: string[] = [];
  @Input() excludeDomains: string[] = [];
  adminEmails: string[] = [];
  ownerEmail: string = "";
  splitPattern = new RegExp('[,\\s]+');
  emailValidator = this.emailValidatorfun();
  searchResults: UserDetails[] = [];
  emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  excludedComponents = ['maintainer', 'viewByEmail', 'postByEmail'];
  userSuggestionList!: UserDetails[];
  info:string[]=[];
  showListTitle:string[]=[];
  btnText:string="";
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private sharedService: SharedDataService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.fetchWallDetails();
    this.setContent();
    this.searchForm = this.fb.group({
      search: [''],
      emailSearch: ''
    });
    this.selectedEmails = [...this.sharedEmails];
    if (this.selectedEmails.length > 0) {
      this.selectedEmails.forEach(email => {
        this.fetchUserDetails(email);
      });
      this.searchResults = this.selectedUsers.sort((a, b) =>
        (a.email ?? '').localeCompare(b.email ?? '')
      );
      this.searchForm.get('emailSearch')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(query => {
        this.searchPara(query);
      });

    }
  }
  

  fetchUserDetails(email: string): void {
    this.userService.fetchUserNamesByEmail(email).subscribe({
      next: (userDetails: UserDetails | null) => {
        if (userDetails) {
          this.selectedUsers.push({
            email: userDetails.email,
            fullName: userDetails.fullName,
            profilePicture: userDetails.profilePicture ?? ''
          });
        }
        else {
          this.selectedUsers.push({
            email: email,
            fullName: '',
            profilePicture: ''
          })
        }
      }
    });
  }


  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), take(1)).subscribe({
        next: (wallData: Wall) => {
          this.ownerEmail = wallData.ownerEmail;
          if (this.component == 'schedule-delivery' && wallData.maintainerEmails?.length) {
            this.adminEmails.push(wallData.ownerEmail);
            this.adminEmails.push(...(wallData.maintainerEmails ?? []));
          }
        },
        error: (err) => {
          this.router.navigateByUrl('error');
          return;
        }
      });
  }


  convertBufferToBase64(buffer: { contentType: string; data: number[] }): string {
    return convertBufferToBase64(buffer);
  }

  removeUser(user: UserDetails): void {
    this.selectedUsers = this.selectedUsers.filter(selectedUser => selectedUser !== user);
    this.searchResults = this.searchResults.filter(selectedUser => selectedUser !== user);
    this.selectedEmails = this.selectedEmails.filter(email => email !== (user.email ?? ''));
    this.emailsChanged.emit(this.selectedEmails);
  }

  toggleDisplay(): void {
    this.showList = !this.showList;
  }

  searchPara(query: string): void {
    if (!query) {
      this.searchResults = this.selectedUsers;
      return;
    }
    const lowerCaseQuery = query.toLowerCase();

    this.searchResults = this.selectedUsers.filter(user =>
      (user.email ?? '').toLowerCase().includes(lowerCaseQuery) ||
      (user.fullName ?? '').toLowerCase().includes(lowerCaseQuery)
    );
  }

  onAdding(tag: TagModel): Observable<TagModel> {
    if (typeof tag === 'string' && tag !== "") {
      tag = {
        email: tag.toLowerCase(),
        name: '',
        profilePicture: ''
      }
    }
    else if(typeof tag === 'object' && tag !== null){
      tag = {
        email: tag['email'].toLowerCase(),
        name: tag['name'] || "",
        profilePicture:tag['profilePicture']
      }
    }
    return of(tag);
  }

  clearError(_event: unknown) {
    if(this.errorMessage)
      this.errorMessage="";
  }


  emailValidatorfun(): ValidatorFn {
    return (control: AbstractControl): Record<string, unknown> | null => {
      const email = control.value;
      const valid = this.emailPattern.test(email);
      return valid ? null : { invalidEmail: { value: email } };
    };
  }

  onAdd() {
    if (!this.searchForm.get('search')?.value) {
      return;
    }
    const invalidEmails: TagModel[] = [];
    this.searchForm.get('search')?.value.forEach((user: TagModel) => {
      const u = user as UserTagModel;
      if (!this.selectedEmails.includes(u.email) && this.selectUser(u.email)) {
        this.setUserDetails(user);
        this.selectedEmails.push(u.email);
        this.searchResults=this.selectedUsers;
      }
      else{
        invalidEmails.push(user);
        switch(this.component){
          case 'maintainer':  this.errorMessage="Already a maintainer or moment creator.";
                              break;
          case 'viewByEmail':  this.errorMessage="Already have view access, or higher level of access.";
                              break;
          case 'postByEmail':  this.errorMessage="Already have post access, or higher level of access.";
                              break;
        }
        
      }
    })
    this.emailsChanged.emit(this.selectedEmails);
    this.searchForm.get('search')?.setValue(invalidEmails);
  }


  clear(){
    this.searchForm.get('search')?.setValue([]);
    this.errorMessage="";
  }

  setUserDetails(user: TagModel) {
    if (user) {
      const u = user as UserTagModel;
      this.selectedUsers.push({
        email: u.email,
        fullName: u.name,
        profilePicture: u.profilePicture
      });
    }
  }

  getInitials(user: UserDetails): string {
    return getInitials(user);
  }

  selectUser(email: string) {
    if (this.excludeEmails.includes(email) || this.excludeDomains.includes(email.split('@')[1]) || this.ownerEmail === email) {
      return false
    }
    return true;
  }


  getFilteredItems = (text: string): Observable<UserDetails[]> => {
    return new Observable(observer => {
      this.userService.searchNames(text).subscribe(results => {
        const currentUserEmail = this.authService.getEmail();
        this.userSuggestionList = results
          .filter(item => item.email !== currentUserEmail)
          .map(user => {
            let profilePicture = '';
            
            if (user.profilePicture && typeof user.profilePicture === 'object') {
              profilePicture = this.convertBufferToBase64(user.profilePicture as { contentType: string; data: number[] });
            } else if (user.profilePictureUrl) {
              profilePicture = user.profilePictureUrl;
            }
  
            return {
              email: user.email,
              name: user.name,
              profilePicture: profilePicture
            };
          });
        observer.next(this.userSuggestionList);
      });
    });
  };

  setContent(){
    switch(this.component){
      case 'maintainer':  this.info[0]="Add maintainers by entering their emails. They can change settings and manage the wall.";
                          this.showListTitle[0]="A Maintainer has been added";
                          this.showListTitle[1]=" Maintainers have been added";
                          this.btnText="Maintainers";
                          break;
      case 'viewByEmail': this.info[0]="Add viewers by email. They can view and react.";
                          this.showListTitle[0]="1 Person has view access";
                          this.showListTitle[1]=" People have view access";
                          this.btnText="Viewers";
                          break;
      case 'postByEmail': this.info[0]="Add posters by email. They can post, edit and react.";
                          this.showListTitle[0]="1 Person has post access";
                          this.showListTitle[1]=" People have post access";
                          this.btnText="Posters";
                          break;
      case 'schedule-delivery': this.info[0] = "Enter recipients to schedule the moment for them."
                                this.showListTitle[1] = " People are scheduled for delivery";
                                this.showListTitle[0]="1 Person is scheduled for delivery";
                                this.btnText="Recipients";
                                break;
    }
  }

  removeAllEmails()
  {
    this.selectedEmails=[];
    this.selectedUsers=[];
    this.emailsChanged.emit(this.selectedEmails);
  }
}
