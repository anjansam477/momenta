import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoaderComponent } from './utils/loader/loader.component';
import { ThemeService } from './services/themeservice/theme.service';
import { SocketService } from './services/socketservice/socket.service';
import { filter } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [RouterOutlet, LoaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly router = inject(Router);
  // Eagerly instantiate ThemeService so data-theme is applied on every route, including direct wall links
  private readonly _theme = inject(ThemeService);
  private readonly socketService = inject(SocketService);
  private readonly currentRoute = signal('');
  private readonly hiddenRoutes = ['/login', '/register', '/forgot-password', '/download', '/verification', '/reset-password', '/changed-password', '/view/'];

  title = 'Momenta';
  showNavbar = computed(() => !this.hiddenRoutes.some((route) => this.currentRoute().startsWith(route)));
  // Only surface a banner while actively reconnecting (not on idle 'disconnected')
  readonly socketStatus = toSignal(this.socketService.connectionStatus$, { initialValue: 'disconnected' as const });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.urlAfterRedirects);
      });
  }
}
