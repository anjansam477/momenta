import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { UI_BASE_URL } from '../../environment-config';
import { filter } from 'rxjs';
import { BackgroundComponent } from '../../components/background/background.component';
import { ScheduleDeliveryComponent } from '../../components/schedule-delivery/schedule-delivery.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-wall-navbar',
  standalone: true,
  imports: [CommonModule, BackgroundComponent, ScheduleDeliveryComponent, SettingsComponent],
  templateUrl: './wall-navbar.component.html',
  styleUrl: './wall-navbar.component.css',
  animations: [
    trigger('slideInOut', [
      state('void', style({ transform: 'translateX(100%)', opacity: 0 })),
      state('*', style({ transform: 'translateX(0)', opacity: 1 })),
      transition('void <=> *', animate('500ms ease-in-out')),
    ]),
  ]
})
export class WallNavbarComponent {

  wallId: string = '';
  wallTitle: string = '';
  wallDescription: string = '';
  loginBoolean: boolean = false;
  wallCreator: any;
  isOpen: any;
  wallNotExpired: any;
  currentPage: any;
  openDate: any;
  closeDate: any;
  isArchived: any;
  isPreview: boolean= false;
  sharedWallUrl: string = '';
  baseUrl: string = UI_BASE_URL; 
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sharedService: SharedDataService,
    private cdr: ChangeDetectorRef
  ) {}

  showSettings = false;
  showBackground = false;
  showScheduleDelivery = false;
  activeControl: 'settings' | 'style' | 'schedule' | null = null;

  openSettings() {
    this.toggleControl('settings');
  }

  openBackground() {
    this.toggleControl('style');
  }

  openScheduleDelivery() {
    this.toggleControl('schedule');
  }

  openControl(control: 'settings' | 'style' | 'schedule') {
    this.activeControl = control;
    this.showSettings = this.activeControl === 'settings';
    this.showBackground = this.activeControl === 'style';
    this.showScheduleDelivery = this.activeControl === 'schedule';
  }

  toggleControl(control: 'settings' | 'style' | 'schedule') {
    this.activeControl = this.activeControl === control ? null : control;
    this.showSettings = this.activeControl === 'settings';
    this.showBackground = this.activeControl === 'style';
    this.showScheduleDelivery = this.activeControl === 'schedule';
  }

  closeModal() {
    this.activeControl = null;
    this.showSettings = false;
    this.showBackground = false;
    this.showScheduleDelivery = false;
  }

  ngOnInit(): void {
    this.isLoggedIn();

    this.route.params.subscribe((params: any) => {
      this.wallId = params['momentId'] ?? params['wallId'];
      this.fetchWallDetails();
      this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
    });
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData)).subscribe({
      next: (wallData: any) => {
        this.wallTitle = wallData.title;
        this.wallDescription = wallData.description;
        this.wallCreator = wallData.ownerEmail;
        this.openDate = wallData.openDate;
        this.closeDate = wallData.closeDate;
        this.isArchived = wallData.isArchived;
        this.isOpen = wallData.isOpen;
        this.cdr.detectChanges();
      },
      error: (err)=>{
        this.router.navigateByUrl('error');
      }
    });
  }

  isLoggedIn(): void {
      this.loginBoolean = !!localStorage.getItem('email');
  }

  preview(){
    this.isPreview = true;
    this.sharedService.setIsPreview(this.isPreview);
  }

  openDashboard() {
    this.router.navigateByUrl(`home/dashboard`);
    sessionStorage.removeItem('viewToken');
    this.sharedService.setPostAvailable(false);
    this.sharedService.setMyPost(false);
  }
  
  download() {
    const downloadUrl = `download/${this.wallId}`;
    const windowOptions = 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes,width=1920,height=1080';
    window.open(downloadUrl, '_blank', windowOptions);
  }
}
