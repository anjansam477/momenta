import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Output, inject , ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { UI_BASE_URL } from '../../environment-config';
import { filter } from 'rxjs';
import { BackgroundComponent } from '../../components/background/background.component';
import { ScheduleDeliveryComponent } from '../../components/schedule-delivery/schedule-delivery.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Wall } from '../../shared/models';
import { Params } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wall-navbar',
  standalone: true,
  imports: [FormsModule, BackgroundComponent, ScheduleDeliveryComponent, SettingsComponent],
  templateUrl: './wall-navbar.component.html',
  styleUrl: './wall-navbar.component.css',
  animations: [
    trigger('fadeSearch', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('180ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('140ms ease', style({ opacity: 0, transform: 'translateY(-6px)' }))
      ])
    ]),
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
  wallCreator: string = '';
  isOpen: boolean = true;
  wallNotExpired: boolean = true;
  currentPage: string = '';
  openDate: string | Date | null = null;
  closeDate: string | Date | null = null;
  isArchived: boolean = false;
  isPreview: boolean= false;
  isCreatorOrMaintainer = false;
  sharedWallUrl: string = '';
  baseUrl: string = UI_BASE_URL; 
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sharedService: SharedDataService,
    private cdr: ChangeDetectorRef
  ) {}

  searchOpen = false;
  searchQuery = '';

  showSettings = false;
  showBackground = false;
  showScheduleDelivery = false;
  activeControl: 'settings' | 'style' | 'schedule' | null = null;
  private readonly destroyRef = inject(DestroyRef);

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

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) {
      this.searchQuery = '';
      this.sharedService.setPostSearchQuery('');
    }
  }

  onSearchInput() {
    this.sharedService.setPostSearchQuery(this.searchQuery);
  }

  closeModal() {
    this.activeControl = null;
    this.showSettings = false;
    this.showBackground = false;
    this.showScheduleDelivery = false;
  }

  ngOnInit(): void {
    this.isLoggedIn();

    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      this.wallId = params['momentId'] ?? params['wallId'];
      this.fetchWallDetails();
      this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
    });
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (wallData: Wall) => {
        this.wallTitle = wallData.title;
        this.wallDescription = wallData.description;
        this.wallCreator = wallData.ownerEmail;
        const userEmail = localStorage.getItem('email') || '';
        const creatorMails = [...(wallData.maintainerEmails || []), wallData.ownerEmail].filter(Boolean);
        this.isCreatorOrMaintainer = creatorMails.includes(userEmail);
        this.openDate = wallData.openDate ?? null;
        this.closeDate = wallData.closeDate ?? null;
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
  
  openAnalytics(): void {
    this.router.navigate(['/moment', this.wallId, 'analytics']);
  }

  download() {
    const downloadUrl = `download/${this.wallId}`;
    const windowOptions = 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes,width=1920,height=1080';
    window.open(downloadUrl, '_blank', windowOptions);
  }
}
