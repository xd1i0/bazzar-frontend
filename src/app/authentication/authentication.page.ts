import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonText } from '@ionic/angular/standalone';
import { Authentication } from './authentication';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.page.html',
  styleUrls: ['./authentication.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, IonText, CommonModule, FormsModule]
})
export class AuthenticationPage implements OnInit, OnDestroy {
  private authService = inject(Authentication);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email: string = '';
  password: string = '';
  vorname: string = '';
  name: string = '';
  zenturie: string = '';
  isLogin: boolean = true;
  errorMessage: string = '';
  isLoading: boolean = false;
  isCheckingAuth: boolean = false; // Changed to false - show form immediately
  private authSubscription?: Subscription;
  private hasNavigated: boolean = false; // Prevent multiple navigations
  private returnUrl: string = '/bazzar'; // Default return URL

  ngOnInit() {
    // Get returnUrl from query parameters if available
    const returnUrlParam = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrlParam) {
      // Handle base path or empty URL - redirect to bazzar
      if (returnUrlParam === '/' || returnUrlParam === '') {
        this.returnUrl = '/bazzar';
      } else if (this.isValidReturnUrl(returnUrlParam)) {
        this.returnUrl = returnUrlParam;
      }
    }

    // Check if user is already authenticated and redirect if so
    // Use take(1) to prevent continuous subscription triggers
    // Removed delay to show login form immediately
    this.authSubscription = this.authService.user$.pipe(
      take(1)
    ).subscribe(user => {
      // Only navigate if user is authenticated and email is verified
      if (user && user.emailVerified && !this.hasNavigated && this.router.url.includes('/authentication')) {
        this.hasNavigated = true;
        // Use replaceUrl to prevent back button from returning to auth page
        this.router.navigate([this.returnUrl], { replaceUrl: true });
      }
    });
  }

  // Validate returnUrl to ensure it's a protected route (not authentication or invalid routes)
  private isValidReturnUrl(url: string): boolean {
    const validRoutes = ['/bazzar', '/doomies', '/favoriten', '/nachrichten', '/einstellungen', '/admin'];
    return validRoutes.some(route => url.startsWith(route));
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
  }

  async onSubmit() {
    // Validate required fields
    if (!this.email || !this.password) {
      this.errorMessage = 'Bitte E-Mail und Passwort eingeben';
      return;
    }

    // Additional validation for registration mode
    if (!this.isLogin && (!this.vorname || !this.name || !this.zenturie)) {
      this.errorMessage = 'Bitte alle Felder ausfüllen';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    let result;
    if (this.isLogin) {
      result = await this.authService.login(this.email, this.password);
    } else {
      result = await this.authService.signup(this.email, this.password, this.vorname, this.name, this.zenturie);
    }

    this.isLoading = false;

    if (result.success) {
      this.hasNavigated = true;
      // Use replaceUrl to prevent back button from returning to auth page
      if (this.isLogin) {
        // For login, check email verification in auth guard
        this.router.navigate([this.returnUrl], { replaceUrl: true });
      } else {
        // For signup, redirect to email verification page
        this.router.navigate(['/email-verification'], { replaceUrl: true });
      }
    } else {
      this.errorMessage = result.error || 'Ein Fehler ist aufgetreten';
    }
  }
}
