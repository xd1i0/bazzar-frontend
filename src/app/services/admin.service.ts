import { Injectable, inject, computed } from '@angular/core';
import { Authentication } from '../authentication/authentication';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private auth = inject(Authentication);

  // Computed signal to check if current user is admin
  isAdmin = computed(() => {
    const profile = this.auth.currentUserProfile();
    return profile?.role === 'admin';
  });

  // Check if current user can delete any content
  canDeleteAnyContent(): boolean {
    return this.isAdmin();
  }

  // Check if current user can moderate content (flag/hide)
  canModerateContent(): boolean {
    return this.isAdmin();
  }

  // Check if current user can manage users
  canManageUsers(): boolean {
    return this.isAdmin();
  }

  // Check if user owns content OR is admin (for delete operations)
  canDeleteContent(contentOwnerId: string): boolean {
    const currentUser = this.auth.currentUser();
    if (!currentUser) return false;

    // User can delete if they own the content OR they are admin
    return currentUser.uid === contentOwnerId || this.isAdmin();
  }

  // Check if user owns content OR is admin (for edit operations)
  canEditContent(contentOwnerId: string): boolean {
    const currentUser = this.auth.currentUser();
    if (!currentUser) return false;

    // User can edit if they own the content OR they are admin
    return currentUser.uid === contentOwnerId || this.isAdmin();
  }
}
