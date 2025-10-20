import { Injectable, signal, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user, User, sendEmailVerification } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { UserProfile } from '../models/user-profile.interface';
import { clearTokenCache } from '../interceptors/auth.interceptor';

@Injectable({
  providedIn: 'root'
})
export class Authentication {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  user$: Observable<User | null>;
  currentUser = signal<User | null>(null);
  currentUserProfile = signal<UserProfile | null>(null);
  isAuthReady = signal<boolean>(false); // Track if auth has initialized
  private readonly PROFILE_CACHE_KEY = 'user_profile_cache';

  constructor() {
    this.user$ = user(this.auth);
    this.user$.subscribe(user => {
      this.currentUser.set(user);
      this.isAuthReady.set(true); // Mark auth as ready after first emission

      if (user) {
        // Load user profile asynchronously in the background (non-blocking)
        // Check cache first to avoid unnecessary Firestore calls
        const cachedProfile = this.getCachedProfile(user.uid);
        if (cachedProfile) {
          this.currentUserProfile.set(cachedProfile);
        } else {
          // Load from Firestore in background without blocking auth check
          this.getUserProfile(user.uid).then(profile => {
            this.currentUserProfile.set(profile);
            if (profile) {
              this.cacheProfile(user.uid, profile);
            }
          });
        }
      } else {
        this.currentUserProfile.set(null);
      }
    });
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async signup(email: string, password: string, vorname: string, name: string, zenturie: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Create user profile in Firestore
      await this.createUserProfile(userCredential.user.uid, email, vorname, name, zenturie);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  private async createUserProfile(uid: string, email: string, vorname: string, name: string, zenturie: string): Promise<void> {
    const userProfile: UserProfile = {
      uid,
      email,
      vorname,
      name,
      zenturie,
      role: 'user',
      emailVerified: false,
      createdAt: new Date()
    };

    const userDocRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userDocRef, userProfile);
  }

  async resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.currentUser();
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }
      await sendEmailVerification(user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to send verification email. Please try again.' };
    }
  }

  async checkEmailVerification(): Promise<boolean> {
    const user = this.currentUser();
    if (!user) return false;

    // Reload user to get fresh email verification status
    await user.reload();

    // Update Firestore profile if verification status changed
    if (user.emailVerified) {
      const profile = this.currentUserProfile();
      if (profile && !profile.emailVerified) {
        await this.updateUserProfile(user.uid, { emailVerified: true });
      }
    }

    return user.emailVerified;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.clearProfileCache();
    clearTokenCache(); // Clear cached auth token
    this.router.navigate(['/authentication']);
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, updates, { merge: true });

      // Clear cache and reload profile
      this.clearProfileCache();
      const updatedProfile = await this.getUserProfile(uid);
      if (updatedProfile) {
        this.currentUserProfile.set(updatedProfile);
        this.cacheProfile(uid, updatedProfile);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Failed to update profile. Please try again.' };
    }
  }

  private getCachedProfile(uid: string): UserProfile | null {
    try {
      const cached = localStorage.getItem(`${this.PROFILE_CACHE_KEY}_${uid}`);
      if (cached) {
        const profile = JSON.parse(cached);
        // Convert createdAt back to Date object
        if (profile.createdAt) {
          profile.createdAt = new Date(profile.createdAt);
        }
        return profile as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error reading profile cache:', error);
      return null;
    }
  }

  private cacheProfile(uid: string, profile: UserProfile): void {
    try {
      localStorage.setItem(`${this.PROFILE_CACHE_KEY}_${uid}`, JSON.stringify(profile));
    } catch (error) {
      console.error('Error caching profile:', error);
    }
  }

  private clearProfileCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PROFILE_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing profile cache:', error);
    }
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'An error occurred. Please try again';
    }
  }
}
