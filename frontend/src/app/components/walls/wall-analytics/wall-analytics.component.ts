import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WallService, WallAnalyticsDay, WallAnalyticsTotals } from '../../../services/wallservice/wall.service';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { AuthService } from '../../../services/authservice/auth.service';
import { isWallCreator } from '../../../utils/wall.util';
import { filter, take } from 'rxjs';
import { Wall } from '../../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wall-analytics',
  standalone: true,
  imports: [],
  templateUrl: './wall-analytics.component.html',
  styleUrl: './wall-analytics.component.css'
})
export class WallAnalyticsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  wallId = '';
  days = 30;
  daily: WallAnalyticsDay[] = [];
  totals: WallAnalyticsTotals = { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private sharedService: SharedDataService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('momentId') ?? this.route.snapshot.paramMap.get('wallId') ?? '';

    // Guard: only creator/maintainer can view
    this.sharedService.getWallDetails().pipe(
      filter(w => !!w), take(1), takeUntilDestroyed(this.destroyRef)
    ).subscribe((wall: Wall) => {
      const userEmail = this.authService.getEmail() ?? '';
      const creatorMails = [...(wall.maintainerEmails || []), wall.ownerEmail].filter(Boolean);
      if (!isWallCreator(userEmail, creatorMails)) {
        this.router.navigateByUrl('error');
        return;
      }
      this.loadAnalytics();
    });
  }

  loadAnalytics(): void {
    this.loading = true;
    this.error = false;
    this.wallService.getWallAnalytics(this.wallId, this.days).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.daily = data.daily;
        this.totals = data.totals;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setDays(d: number): void {
    this.days = d;
    this.loadAnalytics();
  }

  back(): void {
    this.router.navigateByUrl(`moment/${this.wallId}`);
  }

  maxBarValue(): number {
    return Math.max(1, ...this.daily.map(d => Math.max(d.views, d.postCount, d.reactionCount)));
  }

  barHeight(value: number): number {
    return Math.round((value / this.maxBarValue()) * 100);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
