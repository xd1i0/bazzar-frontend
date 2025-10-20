import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonIcon, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonGrid, IonRow, IonCol, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, heartOutline, gridOutline, listOutline, search, add, person } from 'ionicons/icons';
import { Authentication } from '../../authentication/authentication';
import { ApiService } from 'src/app/services/api.service';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs, query } from '@angular/fire/firestore';
import { PostDetailModalComponent } from '../../shared/components/post-detail-modal.component';
import { BazzarItem } from '../../models/bazzar.interface';

@Component({
  selector: 'app-favoriten',
  templateUrl: './favoriten.page.html',
  styleUrls: ['./favoriten.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonIcon,
    IonSearchbar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonGrid,
    IonRow,
    IonCol
  ],
})
export class FavoritenPage implements OnInit {
  public searchText: string = '';
  public viewMode: 'grid' | 'list' = 'grid';
  public items: BazzarItem[] = [];
  public isLoading: boolean = true;
  public isRefreshing: boolean = false;
  private favoritePostIds: Set<string> = new Set();
  private isModalOpen: boolean = false;
  apiService: ApiService;
  private firestore: Firestore = inject(Firestore);

  // Getter for filtered items based on search text
  get filteredItems(): BazzarItem[] {
    if (!this.searchText || this.searchText.trim() === '') {
      return this.items;
    }

    const searchLower = this.searchText.toLowerCase().trim();

    return this.items.filter(item => {
      // Search in title
      if (item.title?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in description
      if (item.description?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in text
      if (item.text?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in tags
      if (item.tags?.some(tag => tag.toLowerCase().includes(searchLower))) {
        return true;
      }

      return false;
    });
  }

  public authService = inject(Authentication);
  private modalController = inject(ModalController);

  constructor() {
    this.apiService = inject(ApiService);
    // Register all icons
    addIcons({ heart, heartOutline, gridOutline, listOutline, search, add, person });
  }

  async ngOnInit(isRefresh: boolean = false) {
    const user = this.authService.currentUser();
    console.log('FavoritenPage: User on init:', user?.email || 'No user');

    // Only show loading animation if it's not a refresh
    if (!isRefresh) {
      this.isLoading = true;
      console.log('FavoritenPage: Loading started');
    }

    // Load favorite items
    await this.loadFavoriteItems(isRefresh);
  }

  /**
   * Load favorite items by first getting favorite IDs from Firestore,
   * then fetching each post individually from the API
   */
  async loadFavoriteItems(isRefresh: boolean = false) {
    const user = this.authService.currentUser();
    if (!user) {
      console.log('No user logged in, skipping favorites load');
      this.items = [];
      if (!isRefresh) {
        this.isLoading = false;
      }
      return;
    }

    try {
      console.log('FavoritenPage: Loading favorites from Firestore...');

      // Load all favorite post IDs from Firestore
      const favoritesRef = collection(this.firestore, `users/${user.uid}/favorites`);
      const favoritesQuery = query(favoritesRef);
      const querySnapshot = await getDocs(favoritesQuery);

      const favoritePostIds: string[] = [];
      this.favoritePostIds.clear();
      querySnapshot.forEach((doc) => {
        favoritePostIds.push(doc.id);
        this.favoritePostIds.add(doc.id);
      });

      console.log(`Found ${favoritePostIds.length} favorites in Firestore`);

      if (favoritePostIds.length === 0) {
        this.items = [];
        console.log('No favorites found');
        if (!isRefresh) {
          this.isLoading = false;
        }
        return;
      }

      // Fetch each favorited post individually from the API
      const postPromises = favoritePostIds.map(postId =>
        new Promise<BazzarItem | null>((resolve) => {
          this.apiService.getPostById(postId).subscribe({
            next: (post: BazzarItem) => {
              console.log(`Fetched post ${postId}:`, post.title);
              resolve(post);
            },
            error: (error) => {
              console.warn(`Failed to fetch post ${postId}:`, error);
              // If post not found, clean up the stale favorite
              if (error.status === 400 || error.status === 404) {
                console.log(`Post ${postId} no longer exists, removing from favorites`);
                const favoriteDocRef = doc(this.firestore, `users/${user.uid}/favorites/${postId}`);
                deleteDoc(favoriteDocRef).catch(err =>
                  console.error(`Failed to delete stale favorite ${postId}:`, err)
                );
              }
              resolve(null); // Return null for failed fetches
            }
          });
        })
      );

      // Wait for all post fetches to complete
      const fetchedPosts = await Promise.all(postPromises);

      // Filter out null values (failed fetches) and transform for UI display
      this.items = fetchedPosts
        .filter((post): post is BazzarItem => post !== null)
        .map(item => ({
          ...item,
          isFavorite: true, // All items in favorites page are favorited
          image: item.images && item.images.length > 0 ? item.images[0] : 'assets/shared/sampleImage.jpg',
          tagObjects: item.tags.map(tag => this.createTagObject(tag))
        }));

      console.log(`FavoritenPage: Loaded ${this.items.length} favorited items`);
      
      // Set loading to false only if it's not a refresh
      if (!isRefresh) {
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error loading favorite items:', error);
      this.items = [];
      if (!isRefresh) {
        this.isLoading = false;
      }
      // TODO: Show error message to user (e.g., using Ionic Toast)
    }
  }

  // Helper method to create tag objects with colors
  private createTagObject(tagName: string): { name: string; color: string } {
    // Define colors for different tag types
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

    // Prevent double-clicking from opening multiple modals
    if (this.isModalOpen) {
      console.log('Modal already open, ignoring click');
      return;
    }

    this.isModalOpen = true;

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

      // Reset modal flag
      this.isModalOpen = false;

      // Reload data if post was updated or deleted
      if (result.data?.updated || result.data?.deleted) {
        console.log('Post changed, reloading favorite items...');
        this.loadFavoriteItems();
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

        // Remove the item from the favorites list since we're on the favorites page
        this.items = this.items.filter(i => i.id !== item.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert the UI change on error
      item.isFavorite = !item.isFavorite;
      // TODO: Show error message to user
    }
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    console.log('FavoritenPage: Pull-to-refresh triggered');
    this.isRefreshing = true;
    try {
      await this.loadFavoriteItems(true); // Pass true to indicate this is a refresh
    } finally {
      this.isRefreshing = false;
      event.target.complete();
    }
  }
}
