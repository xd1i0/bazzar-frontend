import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonSpinner, IonIcon, IonText } from '@ionic/angular/standalone';
import { Authentication } from '../../authentication/authentication';
import { addIcons } from 'ionicons';
import { mailOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.page.html',
  styleUrls: ['./email-verification.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonSpinner,
    IonIcon,
    IonText
  ]
})
export class EmailVerificationPage implements OnInit {
  private auth = inject(Authentication);
  private router = inject(Router);

  isChecking = false;
  isResending = false;
  resendSuccess = false;
  resendError = '';
  userEmail = '';

  constructor() {
    addIcons({ mailOutline, checkmarkCircleOutline, alertCircleOutline });
  }

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.userEmail = user.email || '';
    }
  }

  async checkVerification() {
    this.isChecking = true;
    const isVerified = await this.auth.checkEmailVerification();

    if (isVerified) {
      // Email is verified, redirect to app
      this.router.navigate(['/bazzar']);
    } else {
      this.isChecking = false;
    }
  }

  async resendEmail() {
    this.isResending = true;
    this.resendSuccess = false;
    this.resendError = '';

    const result = await this.auth.resendVerificationEmail();

    if (result.success) {
      this.resendSuccess = true;
      setTimeout(() => {
        this.resendSuccess = false;
      }, 5000);
    } else {
      this.resendError = result.error || 'Failed to send email';
    }

    this.isResending = false;
  }

  async logout() {
    await this.auth.logout();
  }
}
