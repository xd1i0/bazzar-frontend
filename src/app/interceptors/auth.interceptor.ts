import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, lastValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Authentication } from '../authentication/authentication';

// Token cache with TTL
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;
const TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutes in milliseconds (Firebase tokens expire after 1 hour)

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Authentication);

  // List of public endpoints that don't require authentication
  const publicEndpoints = ['/public'];

  // Check if the request URL matches any public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

  // If it's a public endpoint, proceed without adding the token
  if (isPublicEndpoint) {
    return next(req);
  }

  // Get the current user
  const user = authService.currentUser();

  // If no user is logged in, proceed without adding the token
  if (!user) {
    return next(req);
  }

  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiryTime > now) {
    // Use cached token
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${cachedToken}`
      }
    });
    return next(clonedRequest);
  }

  // Fetch new token and cache it
  return from(user.getIdToken()).pipe(
    switchMap((token) => {
      // Cache the token
      cachedToken = token;
      tokenExpiryTime = now + TOKEN_CACHE_DURATION;

      // Clone the request and add the Authorization header
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(clonedRequest);
    })
  );
};

// Export function to clear token cache (useful for logout)
export const clearTokenCache = () => {
  cachedToken = null;
  tokenExpiryTime = 0;
};
