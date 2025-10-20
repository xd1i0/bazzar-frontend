import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonIcon, IonContent, IonRefresher, IonRefresherContent, IonGrid, IonRow, IonCol, IonItem, IonInput, IonLabel, ModalController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, heartOutline, gridOutline, listOutline, person, save, close, checkmarkCircle } from 'ionicons/icons';
import { Authentication } from '../../authentication/authentication';
import { ApiService } from 'src/app/services/api.service';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs, query } from '@angular/fire/firestore';
import { PostDetailModalComponent } from '../../shared/components/post-detail-modal.component';
import { BazzarItem } from '../../models/bazzar.interface';
import { UserProfile } from '../../models/user-profile.interface';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-einstellungen',
  templateUrl: './einstellungen.page.html',
  styleUrls: ['./einstellungen.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonInput,
    IonLabel
  ],
})
export class EinstellungenPage implements OnInit {
  public viewMode: 'grid' | 'list' = 'grid';
  public myPosts: BazzarItem[] = [];
  public acceptedPosts: BazzarItem[] = [];
  public isLoading: boolean = true;
  public isRefreshing: boolean = false;
  private favoritePostIds: Set<string> = new Set();
  apiService: ApiService;
  private firestore: Firestore = inject(Firestore);

  // Profile edit form properties
  public editMode: boolean = false;
  public profileForm = {
    vorname: '',
    name: '',
    zenturie: '',
    email: ''
  };
  public isSaving: boolean = false;

  public authService = inject(Authentication);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.apiService = inject(ApiService);
    // Register all icons
    addIcons({ heart, heartOutline, gridOutline, listOutline, person, save, close, checkmarkCircle });
  }

  async ngOnInit() {
    await this.loadData(false);
  }

  private async loadData(isRefresh: boolean = false) {
    const user = this.authService.currentUser();
    console.log('EinstellungenPage: User on init:', user?.email || 'No user');

    // Only show loading animation if it's not a refresh
    if (!isRefresh) {
      this.isLoading = true;
      console.log('EinstellungenPage: Loading started');
    }

    // Load user profile data
    const profile = this.authService.currentUserProfile();
    if (profile) {
      this.profileForm = {
        vorname: profile.vorname,
        name: profile.name,
        zenturie: profile.zenturie,
        email: profile.email
      };
    }

    try {
      // Load user's posts, accepted posts, and favorites
      await Promise.all([
        this.loadMyPosts(),
        this.loadAcceptedPosts(),
        this.loadFavorites()
      ]);

      console.log('EinstellungenPage: All data loaded successfully');
    } catch (error) {
      console.error('EinstellungenPage: Error loading data:', error);
      // Continue execution even if there's an error - show what we have
    } finally {
      // Always turn off loading after all data is loaded
      if (!isRefresh) {
        this.isLoading = false;
        console.log('EinstellungenPage: Loading finished');
        // Force Angular to detect the change
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * Load posts created by the current user
   */
  async loadMyPosts(): Promise<void> {
    console.log('EinstellungenPage: loadMyPosts() called');
    const user = this.authService.currentUser();
    if (!user) {
      console.log('EinstellungenPage: No user logged in, skipping posts load');
      this.myPosts = [];
      return;
    }

    try {
      console.log('EinstellungenPage: Fetching user posts for:', user.uid);

      // Use firstValueFrom to properly convert Observable to Promise
      const posts = await firstValueFrom(this.apiService.getUserPosts(user.uid));

      console.log(`EinstellungenPage: Fetched ${posts.length} posts for user ${user.uid}`);

      // Transform for UI display
      this.myPosts = posts.map(item => ({
        ...item,
        isFavorite: this.favoritePostIds.has(item.id),
        image: item.images && item.images.length > 0 ? item.images[0] : 'assets/shared/sampleImage.jpg',
        tagObjects: item.tags.map(tag => this.createTagObject(tag))
      }));

      console.log(`EinstellungenPage: Successfully loaded ${this.myPosts.length} user posts`);
    } catch (error) {
      console.error('EinstellungenPage: Error loading user posts:', error);
      this.myPosts = [];
    }
    console.log('EinstellungenPage: loadMyPosts() finished');
  }

  /**
   * Load posts where the current user was accepted
   */
  async loadAcceptedPosts(): Promise<void> {
    console.log('EinstellungenPage: loadAcceptedPosts() called');
    const user = this.authService.currentUser();
    if (!user) {
      console.log('EinstellungenPage: No user logged in, skipping accepted posts load');
      this.acceptedPosts = [];
      return;
    }

    try {
      console.log('EinstellungenPage: Fetching accepted posts for:', user.uid);

      // Use firstValueFrom to properly convert Observable to Promise
      const posts = await firstValueFrom(this.apiService.getUserAcceptedPosts(user.uid));

      console.log(`EinstellungenPage: Fetched ${posts.length} accepted posts for user ${user.uid}`);

      // Transform for UI display
      this.acceptedPosts = posts.map(item => ({
        ...item,
        isFavorite: this.favoritePostIds.has(item.id),
        image: item.images && item.images.length > 0 ? item.images[0] : 'assets/shared/sampleImage.jpg',
        tagObjects: item.tags.map(tag => this.createTagObject(tag))
      }));

      console.log(`EinstellungenPage: Successfully loaded ${this.acceptedPosts.length} accepted posts`);
    } catch (error) {
      console.error('EinstellungenPage: Error loading accepted posts:', error);
      this.acceptedPosts = [];
    }
    console.log('EinstellungenPage: loadAcceptedPosts() finished');
  }

  /**
   * Load user's favorite post IDs from Firestore
   */
  async loadFavorites(): Promise<void> {
    console.log('EinstellungenPage: loadFavorites() called');
    const user = this.authService.currentUser();
    if (!user) {
      console.log('EinstellungenPage: No user logged in, skipping favorites load');
      return;
    }

    try {
      console.log('EinstellungenPage: Fetching favorites for user:', user.uid);
      const favoritesRef = collection(this.firestore, `users/${user.uid}/favorites`);
      const favoritesQuery = query(favoritesRef);
      const querySnapshot = await getDocs(favoritesQuery);

      this.favoritePostIds.clear();
      querySnapshot.forEach((doc: any) => {
        this.favoritePostIds.add(doc.id);
      });

      console.log(`EinstellungenPage: Loaded ${this.favoritePostIds.size} favorites`);

      // Update isFavorite flags for loaded posts
      if (this.myPosts.length > 0) {
        this.myPosts = this.myPosts.map(item => ({
          ...item,
          isFavorite: this.favoritePostIds.has(item.id)
        }));
        console.log('EinstellungenPage: Updated isFavorite flags for myPosts');
      }

      // Update isFavorite flags for accepted posts
      if (this.acceptedPosts.length > 0) {
        this.acceptedPosts = this.acceptedPosts.map(item => ({
          ...item,
          isFavorite: this.favoritePostIds.has(item.id)
        }));
        console.log('EinstellungenPage: Updated isFavorite flags for acceptedPosts');
      }
    } catch (error) {
      console.error('EinstellungenPage: Error loading favorites:', error);
      this.favoritePostIds.clear();
    }
    console.log('EinstellungenPage: loadFavorites() finished');
  }

  /**
   * Helper method to create tag objects with colors
   */
  private createTagObject(tagName: string): { name: string; color: string } {
    const tagColors: { [key: string]: string } = {
      'electronics': '#4CAF50',
      'vintage': '#FF9800',
      'camera': '#2196F3',
      'furniture': '#9C27B0',
      'books': '#795548',
      'clothing': '#E91E63',
      'toys': '#FFC107',
      'sports': '#00BCD4',
      'default': '#607D8B'
    };

    return {
      name: tagName,
      color: tagColors[tagName.toLowerCase()] || tagColors['default']
    };
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  async onCardClick(item: BazzarItem) {
    console.log('Card clicked:', item);

    // Add blur class to body
    document.body.classList.add('post-detail-modal-open');

    const modal = await this.modalController.create({
      component: PostDetailModalComponent,
      cssClass: 'post-detail-modal',
      componentProps: {
        postId: item.id
      }
    });

    modal.onDidDismiss().then((result) => {
      // Remove blur class from body when modal is dismissed
      document.body.classList.remove('post-detail-modal-open');

      // Reload data if post was updated or deleted
      if (result.data?.updated || result.data?.deleted) {
        console.log('Post changed, reloading user posts...');
        this.loadMyPosts();
        this.loadAcceptedPosts();
      }
    });

    return await modal.present();
  }

  async toggleFavorite(item: BazzarItem, event: Event) {
    event.stopPropagation();

    const user = this.authService.currentUser();
    if (!user) {
      console.error('Cannot toggle favorite: User not logged in');
      return;
    }

    // Toggle the UI immediately for better UX
    item.isFavorite = !item.isFavorite;

    try {
      const favoriteDocRef = doc(this.firestore, `users/${user.uid}/favorites/${item.id}`);

      if (item.isFavorite) {
        // Add to favorites
        await setDoc(favoriteDocRef, {
          postId: item.id,
          title: item.title,
          image: item.image,
          favoritedAt: new Date()
        });
        this.favoritePostIds.add(item.id);
        console.log('Added to favorites:', item.id);
      } else {
        // Remove from favorites
        await deleteDoc(favoriteDocRef);
        this.favoritePostIds.delete(item.id);
        console.log('Removed from favorites:', item.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert the UI change on error
      item.isFavorite = !item.isFavorite;
    }
  }

  /**
   * Handle pull-to-refresh
   */
  async handleRefresh(event: any) {
    console.log('EinstellungenPage: Pull-to-refresh triggered');
    this.isRefreshing = true;
    try {
      await this.loadData(true); // Pass true to indicate this is a refresh
    } finally {
      this.isRefreshing = false;
      event.target.complete();
    }
  }

  /**
   * Enter edit mode for profile
   */
  enterEditMode() {
    this.editMode = true;
  }

  /**
   * Cancel profile editing
   */
  cancelEdit() {
    this.editMode = false;
    // Reset form to current profile values
    const profile = this.authService.currentUserProfile();
    if (profile) {
      this.profileForm = {
        vorname: profile.vorname,
        name: profile.name,
        zenturie: profile.zenturie,
        email: profile.email
      };
    }
  }

  /**
   * Save profile changes
   */
  async saveProfile() {
    const user = this.authService.currentUser();
    if (!user) {
      console.error('Cannot save profile: User not logged in');
      return;
    }

    this.isSaving = true;

    try {
      const updates: Partial<UserProfile> = {
        vorname: this.profileForm.vorname,
        name: this.profileForm.name,
        zenturie: this.profileForm.zenturie,
        email: this.profileForm.email
      };

      const result = await this.authService.updateUserProfile(user.uid, updates);

      if (result.success) {
        this.editMode = false;
        await this.showToast('Profil erfolgreich aktualisiert', 'success');
      } else {
        await this.showToast(result.error || 'Fehler beim Speichern', 'danger');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      await this.showToast('Fehler beim Speichern des Profils', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }
}
