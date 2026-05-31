import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { UserService } from '../../../services/userservice/user.service';
import { CommonModule } from '@angular/common';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/authservice/auth.service';
import { TagInputModule } from 'ngx-chips';
import { Observable, of } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

type TagModel = string | Record<string, any>;

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagInputModule],
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
  searchForm!: FormGroup;
  selectedUsers: any[] = [];
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
  searchResults: any[] = [];
  emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  excludedComponents = ['maintainer', 'viewByEmail', 'postByEmail'];
  userSuggestionList!: any[];
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
        a.email.localeCompare(b.email)
      );
      this.searchForm.get('emailSearch')?.valueChanges.subscribe(query => {
        this.searchPara(query);
      });

    }
  }
  

  fetchUserDetails(email: string): void {
    this.userService.fetchUserNamesByEmail(email).subscribe({
      next: (userDetails: any) => {
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
      filter(wallData => !!wallData)).subscribe({
        next: (wallData: any) => {
          this.ownerEmail = wallData.ownerEmail;
          if (this.component == 'schedule-delivery' && wallData.maintainerEmails) {
            this.adminEmails.push(wallData.ownerEmail);
            this.adminEmails.push(...wallData.maintainerEmails);
          }
        },
        error: (err) => {
          this.router.navigateByUrl('error');
          return;
        }
      });
  }


  convertBufferToBase64(buffer: any): string {
    return `data:${buffer.contentType};base64,${buffer.data.toString('base64')}`;

  }

  removeUser(user: any): void {
    this.selectedUsers = this.selectedUsers.filter(selectedUser => selectedUser !== user);
    this.searchResults = this.searchResults.filter(selectedUser => selectedUser !== user);
    this.selectedEmails = this.selectedEmails.filter(email => email !== user.email);
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
      user.email.toLowerCase().includes(lowerCaseQuery) ||
      user.fullName.toLowerCase().includes(lowerCaseQuery)
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

  clearError(event: any) {
    if(this.errorMessage)
      this.errorMessage="";
  }


  emailValidatorfun(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const email = control.value;
      const valid = this.emailPattern.test(email);
      return valid ? null : { invalidEmail: { value: email } };
    };
  }

  onAdd() {
    if (!this.searchForm.get('search')?.value) {
      return;
    }
    const invalidEmails: any[]=[];
    this.searchForm.get('search')?.value.forEach((user: any) => {
      if (!this.selectedEmails.includes(user.email) && this.selectUser(user.email)) {
        this.setUserDetails(user);
        this.selectedEmails.push(user.email);
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

  setUserDetails(user:any){
        if (user) {
          this.selectedUsers.push({
            email: user.email,
            fullName: user.name,
            profilePicture: user.profilePicture
          });
        }
  }

  getInitials(user: any): string {
    const source = user?.fullName || user?.name || user?.email || '?';
    const words = source.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  selectUser(email: string) {
    if (this.excludeEmails.includes(email) || this.excludeDomains.includes(email.split('@')[1]) || this.ownerEmail === email) {
      return false
    }
    return true;
  }


  getFilteredItems = (text: string): Observable<any[]> => {
    return new Observable(observer => {
      this.userService.searchNames(text).subscribe(results => {
        const currentUserEmail = this.authService.getEmail();
        // this.userDetails = results;
        this.userSuggestionList = results
          .filter(item => item.email !== currentUserEmail)
          .map(user => {
            let profilePicture = '';
            
            if (user.profilePicture) {
              profilePicture = this.convertBufferToBase64(user.profilePicture);
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
      case 'maintainer':  this.info[0]="Add maintainers by entering their emails.";
                          this.info[1]="Maintainers can change settings and manage";
                          this.info[2]="walls."
                          this.showListTitle[0]="A Maintainer has been added";
                          this.showListTitle[1]=" Maintainers have been added";
                          this.btnText="Maintainers";
                          break;
      case 'viewByEmail': this.info[0]="Add viewers by email. They can view and react.";
                          this.showListTitle[0]="1 Person has view access";
                          this.showListTitle[1]=" People have view access";
                          this.btnText="Viewers";
                          break;
      case 'postByEmail': this.info[0]="Add posters by email. They can post, edit and"
                          this.info[1]="react."
                          this.showListTitle[0]="1 Person has post access";
                          this.showListTitle[1]=" People have post access";
                          this.btnText="Posters";
                          break;
      case 'schedule-delivery': this.info[0] = "Enter recipients to schedule the moment for them."
                                this.showListTitle[1] = " People are scheduled for delivery";
                                this.showListTitle[0]="1 Person is scheduled for delivery";
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
