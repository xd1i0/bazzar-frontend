import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Authentication } from '../authentication/authentication';
import { map, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard = () => {
  const authService = inject(Authentication);
  const router = inject(Router);

  // Always wait for the observable to emit with a timeout
  // This prevents checking the signal before Firebase Auth initializes
  return authService.user$.pipe(
    take(1), // Take only the first emission
    timeout(5000), // Add 5 second timeout to prevent infinite waiting
    map(user => {
      const currentUrl = router.url;

      if (user) {
        // Check if email is verified
        if (!user.emailVerified) {
          // Email not verified, redirect to verification page only if not already there
          if (!currentUrl.includes('/email-verification')) {
            router.navigate(['/email-verification'], {
              replaceUrl: true
            });
          }
          return false;
        }
        // User is authenticated and email is verified
        return true;
      } else {
        // User is not authenticated, redirect to login with returnUrl
        // Don't redirect if already on authentication page to prevent loops
        if (!currentUrl.includes('/authentication')) {
          // Handle base path - redirect to bazzar after authentication
          const returnUrl = currentUrl === '/' || currentUrl === '' ? '/bazzar' : currentUrl;
          router.navigate(['/authentication'], {
            queryParams: { returnUrl },
            replaceUrl: true
          });
        }
        return false;
      }
    }),
    catchError(() => {
      // On timeout or error, assume not authenticated
      const currentUrl = router.url;
      // Don't redirect if already on authentication page
      if (!currentUrl.includes('/authentication')) {
        const returnUrl = currentUrl === '/' || currentUrl === '' ? '/bazzar' : currentUrl;
        router.navigate(['/authentication'], {
          queryParams: { returnUrl },
          replaceUrl: true
        });
      }
      return of(false);
    })
  );
};
