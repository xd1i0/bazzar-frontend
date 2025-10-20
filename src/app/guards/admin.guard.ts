import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { Authentication } from '../authentication/authentication';

export const adminGuard = () => {
  const adminService = inject(AdminService);
  const authService = inject(Authentication);
  const router = inject(Router);

  // Wait for auth to be ready
  if (!authService.isAuthReady()) {
    router.navigate(['/authentication']);
    return false;
  }

  // Check if user is admin
  if (adminService.isAdmin()) {
    return true;
  } else {
    // Not an admin, redirect to main page
    router.navigate(['/bazzar']);
    return false;
  }
};
