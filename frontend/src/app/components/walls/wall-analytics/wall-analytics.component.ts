import { Pipe, PipeTransform, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { WallService, WallAnalyticsDay, WallAnalyticsTotals } from '../../../services/wallservice/wall.service';
import { AuthService } from '../../../services/authservice/auth.service';
import { isWallCreator } from '../../../utils/wall.util';
import { Wall } from '../../../shared/models';

@Pipe({ name: 'abs', standalone: true })
export class AbsPipe implements PipeTransform {
  transform(value: number): number { return Math.abs(value); }
}

interface AnalyticsFilter { preset: '1D' | '3D' | '7D' | '30D' | '90D' | 'custom'; days?: number; from?: string; to?: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wall-analytics',
  standalone: true,
  imports: [FormsModule, AbsPipe],
  templateUrl: './wall-analytics.component.html',
  styleUrl: './wall-analytics.component.css'
})
export class WallAnalyticsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  wallId = '';

  // Filter state
  presets: AnalyticsFilter['preset'][] = ['1D', '3D', '7D', '30D', '90D', 'custom'];
  filter: AnalyticsFilter = { preset: '30D', days: 30 };
  customFrom = '';
  customTo = '';
  showCustom = false;

  // Data state
  daily: WallAnalyticsDay[] = [];
  totals: WallAnalyticsTotals = { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  previousTotals: WallAnalyticsTotals = { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  loading = true;
  error = false;

  // Reactive filter
  private filter$ = new BehaviorSubject<AnalyticsFilter>({ preset: '30D', days: 30 });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.wallId = this.route.snapshot.paramMap.get('momentId') ?? this.route.snapshot.paramMap.get('wallId') ?? '';

    this.wallService.getWallById(this.wallId).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap((response) => {
        const wallData: Wall = (response as { wallDetails?: Wall }).wallDetails ?? (response as Wall);
        const userEmail = this.authService.getEmail() ?? '';
        const creatorMails = [...(wallData.maintainerEmails || []), wallData.ownerEmail].filter(Boolean);
        if (!isWallCreator(userEmail, creatorMails)) {
          this.router.navigateByUrl('error');
          return EMPTY;
        }
        return this.filter$.pipe(
          switchMap(f => {
            this.loading = true;
            this.cdr.markForCheck();
            return this.wallService.getWallAnalytics(this.wallId, f.preset === 'custom'
              ? { from: f.from, to: f.to }
              : { days: f.days }
            );
          })
        );
      })
    ).subscribe({
      next: (data) => {
        this.daily = data.daily;
        this.totals = data.totals;
        this.previousTotals = data.previousTotals;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = true; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  selectPreset(preset: AnalyticsFilter['preset']): void {
    if (preset === 'custom') { this.showCustom = true; return; }
    this.showCustom = false;
    const daysMap: Record<string, number> = { '1D': 1, '3D': 3, '7D': 7, '30D': 30, '90D': 90 };
    this.filter = { preset, days: daysMap[preset] };
    this.filter$.next(this.filter);
    this.cdr.markForCheck();
  }

  applyCustom(): void {
    if (!this.customFrom || !this.customTo) return;
    this.filter = { preset: 'custom', from: this.customFrom, to: this.customTo };
    this.filter$.next(this.filter);
  }

  // SVG chart helpers
  readonly CHART_W = 700;
  readonly CHART_H = 160;
  readonly PAD_L = 36;
  readonly PAD_B = 24;
  readonly PAD_T = 12;

  get chartUsableW() { return this.CHART_W - this.PAD_L - 16; }
  get chartUsableH() { return this.CHART_H - this.PAD_T - this.PAD_B; }

  maxVal(): number {
    return Math.max(1, ...this.daily.map(d => Math.max(d.views, d.postCount, d.reactionCount)));
  }

  xPos(i: number): number {
    const n = this.daily.length;
    if (n <= 1) return this.PAD_L + this.chartUsableW / 2;
    return this.PAD_L + (i / (n - 1)) * this.chartUsableW;
  }

  yPos(value: number): number {
    return this.PAD_T + this.chartUsableH - (value / this.maxVal()) * this.chartUsableH;
  }

  linePath(key: 'views' | 'postCount' | 'reactionCount'): string {
    if (!this.daily.length) return '';
    return this.daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${this.xPos(i).toFixed(1)},${this.yPos(d[key]).toFixed(1)}`).join(' ');
  }

  areaPath(key: 'views' | 'postCount' | 'reactionCount'): string {
    if (!this.daily.length) return '';
    const bottom = (this.PAD_T + this.chartUsableH).toFixed(1);
    const line = this.daily.map((d, i) => `${this.xPos(i).toFixed(1)},${this.yPos(d[key]).toFixed(1)}`).join(' L');
    return `M${this.xPos(0).toFixed(1)},${bottom} L${line} L${this.xPos(this.daily.length - 1).toFixed(1)},${bottom} Z`;
  }

  xLabels(): { x: number; label: string }[] {
    if (!this.daily.length) return [];
    const max = 8;
    const step = Math.max(1, Math.ceil(this.daily.length / max));
    return this.daily
      .map((d, i) => ({ i, d }))
      .filter(({ i }) => i % step === 0 || i === this.daily.length - 1)
      .map(({ i, d }) => ({ x: this.xPos(i), label: this.fmtDate(d.date) }));
  }

  yLabels(): { y: number; label: string }[] {
    const max = this.maxVal();
    const steps = [0, 0.25, 0.5, 0.75, 1];
    return steps.map(s => ({ y: this.yPos(s * max), label: Math.round(s * max).toString() }));
  }

  trend(current: number, previous: number): number {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  peakDay(): { date: string; metric: string; value: number } | null {
    if (!this.daily.length) return null;
    let best = { date: '', metric: '', value: 0 };
    for (const d of this.daily) {
      if (d.views > best.value) best = { date: d.date, metric: 'views', value: d.views };
      if (d.postCount > best.value) best = { date: d.date, metric: 'posts', value: d.postCount };
      if (d.reactionCount > best.value) best = { date: d.date, metric: 'reactions', value: d.reactionCount };
    }
    return best.value > 0 ? best : null;
  }

  avgPerDay(key: 'views' | 'postCount' | 'reactionCount'): number {
    if (!this.daily.length) return 0;
    const sum = this.daily.reduce((acc, d) => acc + d[key], 0);
    return Math.round(sum / this.daily.length * 10) / 10;
  }

  fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  back(): void { this.router.navigateByUrl(`moment/${this.wallId}`); }
}
