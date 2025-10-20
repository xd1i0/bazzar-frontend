import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Authentication } from '../authentication/authentication';
import { map, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const redirectGuard = () => {
  const authService = inject(Authentication);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    timeout(5000),
    map(user => {
      if (user && user.emailVerified) {
        // User is authenticated and verified, redirect to bazzar
        router.navigate(['/bazzar'], { replaceUrl: true });
        return false;
      } else {
        // User is not authenticated, allow access to authentication page
        return true;
      }
    }),
    catchError(() => {
      // On timeout or error, allow access to authentication page
      return of(true);
    })
  );
};
