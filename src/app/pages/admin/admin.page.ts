import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonBadge, IonButton, IonIcon } from '@ionic/angular/standalone';
import { AdminService } from '../../services/admin.service';
import { Authentication } from '../../authentication/authentication';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { shield, people, trash, flag, alertCircle } from 'ionicons/icons';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon
  ]
})
export class AdminPage implements OnInit {
  adminService = inject(AdminService);
  authService = inject(Authentication);
  private router = inject(Router);

  userProfile = this.authService.currentUserProfile;
  isAdmin = this.adminService.isAdmin;

  constructor() {
    addIcons({ shield, people, trash, flag, alertCircle });
  }

  ngOnInit() {
    // Double check admin access
    if (!this.adminService.isAdmin()) {
      this.router.navigate(['/bazzar']);
    }
  }

  navigateToModeration() {
    // Future: Navigate to moderation view
    console.log('Navigate to moderation');
  }

  navigateToUserManagement() {
    // Future: Navigate to user management
    console.log('Navigate to user management');
  }
}
