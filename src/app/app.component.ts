import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { person, logOut } from 'ionicons/icons';
import { IconHomeComponent } from './shared/icons/icon-home.component';
import { IconSmartphoneComponent } from './shared/icons/icon-smartphone.component';
import { IconHeartComponent } from './shared/icons/icon-heart.component';
import { IconBellComponent } from './shared/icons/icon-bell.component';
import { IconSettingsComponent } from './shared/icons/icon-settings.component';
import { Authentication } from './authentication/authentication';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [CommonModule, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IconHomeComponent, IconSmartphoneComponent, IconHeartComponent, IconBellComponent, IconSettingsComponent],
})
export class AppComponent {
  public authService = inject(Authentication);
  private router = inject(Router);

  public appPages = [
    { title: 'Bazzar', url: '/bazzar', icon: 'icon-home' },
    { title: 'Doomies', url: '/doomies', icon: 'icon-smartphone' },
    { title: 'Favoriten', url: '/favoriten', icon: 'icon-heart' },
    { title: 'Benachrichtigungen', url: '/nachrichten', icon: 'icon-bell' },
    { title: 'Einstellungen', url: '/einstellungen', icon: 'icon-settings' },
  ];

  // Initialize based on current URL to prevent menu flash
  showMenu = !this.router.url.includes('/authentication') && !this.router.url.includes('/email-verification');
  showLogout = false;

  constructor() {
    addIcons({ person, logOut });

    // Update menu visibility on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.showMenu = !event.url.includes('/authentication') && !event.url.includes('/email-verification');
      });
  }

  isSelected(url: string): boolean {
    return this.router.isActive(url, false);
  }

  async handleLogout() {
    await this.authService.logout();
  }

  onProfileHover() {
    this.showLogout = true;
  }

  onProfileLeave() {
    this.showLogout = false;
  }
}
