import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonIcon, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonGrid, IonRow, IonCol, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pricetagOutline, gridOutline, listOutline, search, add, heart, heartOutline, person, refreshOutline } from 'ionicons/icons';
import { Authentication } from '../../authentication/authentication';
import { ApiService } from 'src/app/services/api.service';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs, query, getDoc } from '@angular/fire/firestore';
import { CreatePostModalComponent } from '../../shared/components/create-post-modal.component';
import { PostDetailModalComponent } from '../../shared/components/post-detail-modal.component';
import { TagFilterModalComponent } from '../../shared/components/tag-filter-modal.component';
import { BazzarItem } from '../../models/bazzar.interface';

@Component({
  selector: 'app-bazzar',
  templateUrl: './bazzar.page.html',
  styleUrls: ['./bazzar.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class BazzarPage implements OnInit {
  public searchText: string = '';
  public viewMode: 'grid' | 'list' = 'grid';
  public items: BazzarItem[] = [];
  public isLoading: boolean = true;
  public isRefreshing: boolean = false;
  private favoritePostIds: Set<string> = new Set();
  public availableTags: string[] = [];
  public selectedTags: Set<string> = new Set();
  apiService: ApiService;
  private firestore: Firestore = inject(Firestore);
  private isModalOpen: boolean = false;

  // Cached computed values to prevent recalculation on every scroll
  private _cachedFilteredItems: BazzarItem[] = [];
  private _cachedVorschlaegeItems: BazzarItem[] = [];
  private _cachedSeminareItems: BazzarItem[] = [];
  private _cachedWohnungenItems: BazzarItem[] = [];
  private _cachedAlleItems: BazzarItem[] = [];
  private _lastSearchText: string = '';
  private _lastSelectedTags: Set<string> = new Set();
  private _lastItemsLength: number = 0;

  // Getter for filtered items based on search text and selected tags
  get filteredItems(): BazzarItem[] {
    // Check if cache is valid
    if (this._shouldRecalculate()) {
      this._updateCache();
    }
    return this._cachedFilteredItems;
  }

  // Helper to check if we need to recalculate cached values
  private _shouldRecalculate(): boolean {
    return (
      this.searchText !== this._lastSearchText ||
      !this._setsAreEqual(this.selectedTags, this._lastSelectedTags) ||
      this.items.length !== this._lastItemsLength
    );
  }

  // Helper to compare sets
  private _setsAreEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  // Update all cached values
  private _updateCache(): void {
    // Update tracking variables
    this._lastSearchText = this.searchText;
    this._lastSelectedTags = new Set(this.selectedTags);
    this._lastItemsLength = this.items.length;

    // Recalculate filtered items
    let filtered = this.items;

    // Filter by selected tags (OR logic - match ANY selected tag)
    if (this.selectedTags.size > 0) {
      filtered = filtered.filter(item => {
        // Check if item has at least one of the selected tags
        return item.tags?.some(tag => this.selectedTags.has(tag));
      });
    }

    // Filter by search text
    if (this.searchText && this.searchText.trim() !== '') {
      const searchLower = this.searchText.toLowerCase().trim();

      filtered = filtered.filter(item => {
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

    this._cachedFilteredItems = filtered;

    // Recalculate categorized items (only need to do this when not searching)
    const tagFiltered = this._getTagFilteredItemsInternal();

    // Vorschläge items
    const sortedItems = [...tagFiltered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const newestItems = sortedItems.slice(0, 4);
    const ludolphItems = sortedItems
      .filter(item => this.containsLudolph(item) && !newestItems.includes(item))
      .slice(0, 2);
    const combinedItems = [...newestItems, ...ludolphItems];

    if (combinedItems.length < 6) {
      const remainingCount = 6 - combinedItems.length;
      const additionalItems = sortedItems
        .filter(item => !combinedItems.includes(item))
        .slice(0, remainingCount);
      this._cachedVorschlaegeItems = [...combinedItems, ...additionalItems];
    } else {
      this._cachedVorschlaegeItems = combinedItems;
    }

    // Seminare items
    const vorschlaegeIds = new Set(this._cachedVorschlaegeItems.map(item => item.id));
    this._cachedSeminareItems = tagFiltered.filter(item =>
      !vorschlaegeIds.has(item.id) && this.isSeminar(item)
    );

    // Wohnungen items
    const seminareIds = new Set(this._cachedSeminareItems.map(item => item.id));
    this._cachedWohnungenItems = tagFiltered.filter(item =>
      !vorschlaegeIds.has(item.id) &&
      !seminareIds.has(item.id) &&
      this.isWohnung(item)
    );

    // Alle items
    this._cachedAlleItems = tagFiltered;
  }

  // Internal method for tag filtering
  private _getTagFilteredItemsInternal(): BazzarItem[] {
    if (this.selectedTags.size === 0) {
      return this.items;
    }
    return this.items.filter(item => {
      return item.tags?.some(tag => this.selectedTags.has(tag));
    });
  }

  // Helper to check if an item contains "ludolph"
  private containsLudolph(item: BazzarItem): boolean {
    const searchTerm = 'ludolph';
    return item.title?.toLowerCase().includes(searchTerm) ||
           item.description?.toLowerCase().includes(searchTerm) ||
           item.text?.toLowerCase().includes(searchTerm);
  }

  // Helper to check if an item is a seminar
  private isSeminar(item: BazzarItem): boolean {
    const searchTerm = 'seminar';
    // Check tags
    if (item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
      return true;
    }
    // Check title, description, and text
    return item.title?.toLowerCase().includes(searchTerm) ||
           item.description?.toLowerCase().includes(searchTerm) ||
           item.text?.toLowerCase().includes(searchTerm);
  }

  // Helper to check if an item is a wohnung
  private isWohnung(item: BazzarItem): boolean {
    const searchTerms = ['wohnungen', 'wohnung'];
    // Check tags
    if (item.tags?.some(tag =>
      searchTerms.some(term => tag.toLowerCase().includes(term))
    )) {
      return true;
    }
    // Check title, description, and text
    return searchTerms.some(term =>
      item.title?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.text?.toLowerCase().includes(term)
    );
  }

  // Get items for Vorschläge section (always 6 items: 4 newest + 2 with ludolph, filling remaining slots if needed)
  get vorschlaegeItems(): BazzarItem[] {
    if (this._shouldRecalculate()) {
      this._updateCache();
    }
    return this._cachedVorschlaegeItems;
  }

  // Get items for Seminare section (excluding posts already in Vorschläge)
  get seminareItems(): BazzarItem[] {
    if (this._shouldRecalculate()) {
      this._updateCache();
    }
    return this._cachedSeminareItems;
  }

  // Get items for Wohnungen section (excluding posts already in Vorschläge or Seminare)
  get wohnungenItems(): BazzarItem[] {
    if (this._shouldRecalculate()) {
      this._updateCache();
    }
    return this._cachedWohnungenItems;
  }

  // Get items for Alle section (all posts without exclusions)
  get alleItems(): BazzarItem[] {
    if (this._shouldRecalculate()) {
      this._updateCache();
    }
    return this._cachedAlleItems;
  }

  // Check if we should show categorized view (no search active)
  get showCategorizedView(): boolean {
    return !this.searchText || this.searchText.trim() === '';
  }

  public authService = inject(Authentication);
  private modalController = inject(ModalController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.apiService = inject(ApiService);
    // Register all icons
    addIcons({ pricetagOutline, gridOutline, listOutline, search, add, heart, heartOutline, person, refreshOutline });

    // Subscribe to query parameter changes to open modal when URL changes
    // This handles both card clicks and direct URL navigation
    this.route.queryParamMap.subscribe(params => {
      const postId = params.get('postId');
      // Only open modal if:
      // 1. There's a postId
      // 2. Items are loaded (so we can display the modal)
      // 3. No modal is currently open
      if (postId && this.items.length > 0 && !this.isModalOpen) {
        console.log('BazzarPage: Query param changed, opening modal:', postId);
        this.openPostDetailModalById(postId);
      }
    });
  }

  async ngOnInit(isRefresh: boolean = false) {
    const user = this.authService.currentUser();
    console.log('BazzarPage: User on init:', user?.email || 'No user');

    // Only show loading animation if it's not a refresh
    if (!isRefresh) {
      this.isLoading = true;
      console.log('BazzarPage: Loading started');
    }

    try {
      // Load items first (most important content)
      console.log('BazzarPage: Starting to load items...');
      const itemsPromise = this.loadItemsData();

      // Load tags in background
      const tagsPromise = this.loadTags().catch(error => {
        console.warn('Failed to load tags (non-blocking):', error);
        return null;
      });

      // Load favorites in background - don't block main content
      const favoritesPromise = this.loadFavorites().catch(error => {
        console.warn('Failed to load favorites (non-blocking):', error);
        return null; // Don't let favorites failure block the main content
      });

      // Wait for items to load (main content)
      const items = await itemsPromise;
      console.log('BazzarPage: Items loaded, showing content');

      // Show items immediately (without favorites applied yet)
      if (items && items.length > 0) {
        // Backend already includes acceptance data
        this.items = items.map(item => ({
          ...item,
          isFavorite: false, // Will be updated when favorites load
          image: item.images && item.images.length > 0 ? item.images[0] : 'assets/shared/sampleImage.jpg',
          tagObjects: item.tags.map(tag => this.createTagObject(tag))
        }));

        // Set loading to false as soon as we have items to show (but only if not refreshing)
        if (!isRefresh) {
          this.isLoading = false;
          console.log('BazzarPage: Loading state set to false, items visible');
        }
        this.cdr.markForCheck();
      } else {
        // No items to show
        this.items = [];
        if (!isRefresh) {
          this.isLoading = false;
          console.log('BazzarPage: No items found, showing empty state');
        }
        this.cdr.markForCheck();
      }

      // Apply favorites when they're loaded (this happens in background)
      favoritesPromise.then(() => {
        if (this.items.length > 0) {
          this.items = this.items.map(item => ({
            ...item,
            isFavorite: this.favoritePostIds.has(item.id)
          }));
          console.log('BazzarPage: Favorites applied to items');
          this.cdr.markForCheck();
        }
      });

      // Check for postId in query parameters and open modal if present
      const postId = this.route.snapshot.queryParamMap.get('postId');
      if (postId && !this.isModalOpen) {
        console.log('BazzarPage: Found postId in URL on init, opening modal:', postId);
        await this.openPostDetailModalById(postId);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      this.items = [];
      if (!isRefresh) {
        this.isLoading = false;
        console.log('BazzarPage: Error occurred, loading state set to false');
      }
      this.cdr.markForCheck();
    }
  }

  // Load user's favorite post IDs from Firestore
  async loadFavorites() {
    const user = this.authService.currentUser();
    if (!user) {
      console.log('No user logged in, skipping favorites load');
      return;
    }

    try {
      console.log('BazzarPage: Loading favorites for user:', user.uid);
      const favoritesRef = collection(this.firestore, `users/${user.uid}/favorites`);
      const favoritesQuery = query(favoritesRef);

      // Add timeout for Firestore query
      const queryPromise = getDocs(favoritesQuery);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout')), 5000);
      });

      const querySnapshot = await Promise.race([queryPromise, timeoutPromise]) as any;

      this.favoritePostIds.clear();
      querySnapshot.forEach((doc: any) => {
        this.favoritePostIds.add(doc.id);
      });

      console.log('Loaded favorites:', this.favoritePostIds.size, 'posts');
    } catch (error) {
      console.error('Error loading favorites:', error);
      // Don't throw error - favorites are not critical for page load
      this.favoritePostIds.clear();
    }
  }

  // Load available tags from API
  async loadTags(): Promise<void> {
    console.log('BazzarPage: Loading available tags...');
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('BazzarPage: Tags API request timed out after 5 seconds');
        resolve();
      }, 5000);

      this.apiService.getTags().subscribe({
        next: (tags: string[]) => {
          clearTimeout(timeoutId);
          console.log('BazzarPage: Received tags:', tags.length, 'tags');
          this.availableTags = tags;
          resolve();
        },
        error: (error) => {
          clearTimeout(timeoutId);
          console.error('Error loading tags:', error);
          this.availableTags = [];
          resolve();
        }
      });
    });
  }

  // Load items data from API and return as Promise for parallel loading
  loadItemsData(): Promise<BazzarItem[] | null> {
    console.log('BazzarPage: Loading items...');
    return new Promise((resolve) => {
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('BazzarPage: API request timed out after 10 seconds');
        resolve(null);
      }, 10000); // 10 second timeout

      this.apiService.getData().subscribe({
        next: (data: BazzarItem[]) => {
          clearTimeout(timeoutId);
          console.log('BazzarPage: Received data:', data.length, 'items');
          resolve(data);
        },
        error: (error) => {
          clearTimeout(timeoutId);
          console.error('Error loading posts:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText
          });
          // Return empty array instead of null on error so we can show empty state
          resolve([]);
        }
      });
    });
  }

  // Legacy method - kept for backward compatibility if needed elsewhere
  loadItems() {
    console.log('BazzarPage: Loading items...');
    this.apiService.getData().subscribe({
      next: (data: BazzarItem[]) => {
        console.log('BazzarPage: Received data:', data.length, 'items');
        // Transform backend data for UI display
        this.items = data.map(item => ({
          ...item,
          // Backend already includes acceptance data
          isFavorite: this.favoritePostIds.has(item.id), // Check if user has favorited this post
          image: item.images && item.images.length > 0 ? item.images[0] : 'assets/shared/sampleImage.jpg', // Use first image or fallback
          tagObjects: item.tags.map(tag => this.createTagObject(tag)) // Transform tags to objects with colors
        }));
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        // Initialize with empty array on error
        this.items = [];
        // TODO: Show error message to user (e.g., using Ionic Toast)
      }
    });
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

    // Update URL with query parameter without reloading the page
    // The queryParamMap subscription will handle opening the modal
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { postId: item.id },
      queryParamsHandling: 'merge'
    });
  }

  // New method to open modal by postId (used when navigating directly to a post URL)
  async openPostDetailModalById(postId: string) {
    // Guard: If modal is already open, don't open another one
    if (this.isModalOpen) {
      console.log('BazzarPage: Modal already open, preventing duplicate');
      return;
    }

    // Set flag before any async operations
    this.isModalOpen = true;

    // Add blur class to body
    document.body.classList.add('post-detail-modal-open');

    const modal = await this.modalController.create({
      component: PostDetailModalComponent,
      cssClass: 'post-detail-modal',
      componentProps: {
        postId: postId
      }
    });

    modal.onDidDismiss().then((result) => {
      // Remove blur class from body when modal is dismissed
      document.body.classList.remove('post-detail-modal-open');

      // Reset modal flag
      this.isModalOpen = false;

      // Remove query parameter without reloading
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { postId: null },
        queryParamsHandling: 'merge'
      });

      // Reload data if post was updated or deleted
      if (result.data?.updated || result.data?.deleted) {
        console.log('Post changed, reloading data...');
        this.reloadData();
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
    this.cdr.markForCheck();

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
      this.cdr.markForCheck();
      // TODO: Show error message to user
    }
  }

  // Method to reload data (useful for error recovery)
  async reloadData() {
    console.log('BazzarPage: Manual reload triggered');
    await this.ngOnInit();
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    console.log('BazzarPage: Pull-to-refresh triggered');
    this.isRefreshing = true;
    try {
      await this.ngOnInit(true); // Pass true to indicate this is a refresh
    } finally {
      this.isRefreshing = false;
      event.target.complete();
    }
  }

  // Open the create post modal
  async openCreatePostModal() {
    // Check if user is authenticated
    if (!this.authService.currentUser()) {
      console.error('User not authenticated');
      // TODO: Show login prompt or navigate to login
      return;
    }
    
    // Prevent double-clicking from opening multiple modals
    if (this.isModalOpen) {
      console.log('Modal already open, ignoring click');
      return;
    }
    
    this.isModalOpen = true;

    // Add blur class to body
    document.body.classList.add('create-post-modal-open');

    const modal = await this.modalController.create({
      component: CreatePostModalComponent,
      cssClass: 'create-post-modal'
    });

    modal.onDidDismiss().then((result) => {
      // Remove blur class from body when modal is dismissed
      document.body.classList.remove('create-post-modal-open');
      
      // Reset modal flag
      this.isModalOpen = false;

      if (result.data?.created) {
        // Refresh the posts list after successful creation
        console.log('Post created, refreshing list...');
        this.reloadData();
      }
    });

    return await modal.present();
  }

  // Open the tag filter modal
  async openTagFilterModal() {
    console.log('Opening tag filter modal...');
    
    // Prevent double-clicking from opening multiple modals
    if (this.isModalOpen) {
      console.log('Modal already open, ignoring click');
      return;
    }
    
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: TagFilterModalComponent,
      cssClass: 'tag-filter-modal',
      componentProps: {
        availableTags: this.availableTags,
        selectedTags: this.selectedTags
      }
    });

    modal.onDidDismiss().then((result) => {
      // Reset modal flag
      this.isModalOpen = false;
      
      if (result.data?.selectedTags) {
        // Update selected tags
        this.selectedTags = new Set(result.data.selectedTags);
        console.log('Selected tags updated:', Array.from(this.selectedTags));
      }
    });

    return await modal.present();
  }

  // Check if any tags are currently selected (for UI badge display)
  get hasActiveTagFilters(): boolean {
    return this.selectedTags.size > 0;
  }

  // Get count of selected tags (for UI badge display)
  get selectedTagCount(): number {
    return this.selectedTags.size;
  }

  // TrackBy function for *ngFor to improve performance
  trackByItemId(index: number, item: BazzarItem): string {
    return item.id;
  }

  // TrackBy function for tag objects
  trackByTagName(index: number, tag: { name: string; color: string }): string {
    return tag.name;
  }
}
