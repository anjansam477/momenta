import { Routes } from '@angular/router';
import { AuthguardService } from './middleware/guard/authguard/authguard.service';
import { LoginguardService } from './middleware/guard/loginguard/loginguard.service';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./utils/side-image-layout/side-image-layout.component').then((m) => m.SideImageLayoutComponent),
    children: [
      {
        path: 'login',
        canActivate: [LoginguardService],
        loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'blocked',
        loadComponent: () => import('./components/blocked/blocked.component').then((m) => m.BlockedComponent)
      }
    ]
  },
  {
    path: 'home',
    canActivate: [AuthguardService],
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [AuthguardService],
        loadComponent: () => import('./components/dashboard/recents/recents.component').then((m) => m.RecentsComponent)
      },
      {
        path: 'favourite',
        canActivate: [AuthguardService],
        loadComponent: () => import('./components/dashboard/favourite/favourite.component').then((m) => m.FavouriteComponent)
      },
      {
        path: 'archived',
        canActivate: [AuthguardService],
        loadComponent: () => import('./components/dashboard/archived/archived.component').then((m) => m.ArchivedComponent)
      },
      {
        path: 'received',
        canActivate: [AuthguardService],
        loadComponent: () => import('./components/dashboard/received/received.component').then((m) => m.ReceivedComponent)
      },
      {
        path: 'shared',
        canActivate: [AuthguardService],
        loadComponent: () => import('./components/dashboard/shared/shared.component').then((m) => m.SharedComponent)
      }
    ]
  },
  {
    path: 'moment/:momentId',
    loadComponent: () => import('./components/walls/view-wall/view-wall.component').then((m) => m.ViewWallComponent)
  },
  {
    path: 'download/:momentId',
    canActivate: [AuthguardService],
    loadComponent: () => import('./components/walls/download-wall/download-wall.component').then((m) => m.DownloadWallComponent)
  },
  {
    path: 'error',
    loadComponent: () => import('./components/errorpage/errorpage.component').then((m) => m.ErrorpageComponent)
  },
  { path: '**', redirectTo: 'error' }
];
