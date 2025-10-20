import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { redirectGuard } from './guards/redirect.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'authentication',
    pathMatch: 'full',
  },
  {
    path: 'authentication',
    loadComponent: () => import('./authentication/authentication.page').then(m => m.AuthenticationPage),
    canActivate: [redirectGuard]
  },
  {
    path: 'email-verification',
    loadComponent: () => import('./pages/email-verification/email-verification.page').then(m => m.EmailVerificationPage)
  },
  {
    path: 'bazzar',
    loadComponent: () => import('./pages/bazzar/bazzar.page').then((m) => m.BazzarPage),
    canActivate: [authGuard]
  },
  {
    path: 'doomies',
    loadComponent: () => import('./pages/doomies/doomies.page').then((m) => m.DoomiesPage),
    canActivate: [authGuard]
  },
  {
    path: 'favoriten',
    loadComponent: () => import('./pages/favoriten/favoriten.page').then((m) => m.FavoritenPage),
    canActivate: [authGuard]
  },
  {
    path: 'nachrichten',
    loadComponent: () => import('./pages/nachrichten/nachrichten.page').then((m) => m.BenachrichtigungenPage),
    canActivate: [authGuard]
  },
  {
    path: 'einstellungen',
    loadComponent: () => import('./pages/einstellungen/einstellungen.page').then((m) => m.EinstellungenPage),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: '**',
    redirectTo: 'authentication',
    pathMatch: 'full'
  }
];
