import { Component, OnInit, OnDestroy, inject, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { BazzarItem } from '../../models/bazzar.interface';
import { addIcons } from 'ionicons';
import { heartOutline, heart, chatbubbleOutline, shareSocialOutline, volumeMediumOutline, volumeMuteOutline } from 'ionicons/icons';
import { Firestore, doc, setDoc, deleteDoc, collection, getDocs, query } from '@angular/fire/firestore';
import { Authentication } from '../../authentication/authentication';
import { PostDetailModalComponent } from '../../shared/components/post-detail-modal.component';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Meme } from '../../models/meme.interface';
import { forkJoin } from 'rxjs';

type CombinedItem = BazzarItem | Meme;

@Component({
  selector: 'app-doomies',
  templateUrl: './doomies.page.html',
  styleUrls: ['./doomies.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
  ],
})
export class DoomiesPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContent', { read: ElementRef }) scrollContent!: ElementRef;

  private apiService = inject(ApiService);
  public authService = inject(Authentication);
  private modalController = inject(ModalController);
  private cdr = inject(ChangeDetectorRef);

  posts: CombinedItem[] = [];
  private allPosts: CombinedItem[] = [];
  private favoritePostIds: Set<string> = new Set();
  private firestore: Firestore = inject(Firestore);
  private observer: IntersectionObserver | null = null;
  private isLoadingMore = false;
  public isLoading: boolean = true;
  public isRefreshing: boolean = false;
  public isMuted = false;
  private currentlyVisiblePost: CombinedItem | null = null;
  private memePage = 1;
  private carouselIntervals: Map<string, any> = new Map();
  public currentImageIndices: Map<string, number> = new Map();
  private isModalOpen: boolean = false;

  constructor() {
    // Register icons
    addIcons({ heartOutline, heart, chatbubbleOutline, shareSocialOutline, volumeMediumOutline, volumeMuteOutline });
  }

  ngOnInit() {
    this.loadPosts();
    this.checkTtsLanguages();
  }

  async checkTtsLanguages() {
    try {
      const { languages } = await TextToSpeech.getSupportedLanguages();
      console.log('Supported TTS languages:', languages);
    } catch (error) {
      console.error('Error getting supported TTS languages:', error);
    }
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    // Clean up all carousel intervals
    this.carouselIntervals.forEach(interval => clearInterval(interval));
    this.carouselIntervals.clear();
  }

  private setupIntersectionObserver() {
    // Create an intersection observer to detect when we need to load more posts
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('short-card')) {
              const cardElement = entry.target as HTMLElement;
              const index = parseInt(cardElement.getAttribute('data-index') || '0', 10);
              const post = this.posts[index];

              if (post && post !== this.currentlyVisiblePost) {
                // Stop carousel for previous post
                if (this.currentlyVisiblePost && this.currentlyVisiblePost.itemType === 'post') {
                  this.stopCarousel((this.currentlyVisiblePost as BazzarItem).id);
                }

                this.currentlyVisiblePost = post;
                
                // Start carousel for current post if it has multiple images
                if (post.itemType === 'post') {
                  const bazzarPost = post as BazzarItem;
                  if (this.hasMultipleImages(bazzarPost)) {
                    this.startCarousel(bazzarPost);
                  }
                  
                  if (!this.isMuted) {
                    this.speakPost(bazzarPost);
                  }
                } else if (post.itemType === 'meme') {
                  if (!this.isMuted) {
                    this.speakMeme(post as Meme);
                  }
                }
              }
            } else if (entry.target.classList.contains('scroll-trigger') && !this.isLoadingMore) {
              console.log('Scroll trigger visible! Loading more posts...');
              this.loadMorePosts();
            }
          } else {
            // Stop carousel when post goes out of view
            if (entry.target.classList.contains('short-card')) {
              const cardElement = entry.target as HTMLElement;
              const index = parseInt(cardElement.getAttribute('data-index') || '0', 10);
              const post = this.posts[index];
              if (post && post.itemType === 'post') {
                this.stopCarousel((post as BazzarItem).id);
              }
            }
          }
        });
      },
      {
        root: this.scrollContent?.nativeElement,
        rootMargin: '0px',
        threshold: 0.75, // Trigger when 75% of the post is visible
      }
    );

    // Observe all scroll triggers
    this.observeElements();
  }

  private observeElements() {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const elementsToObserve = this.scrollContent?.nativeElement?.querySelectorAll('.scroll-trigger, .short-card');
      if (elementsToObserve && elementsToObserve.length > 0) {
        elementsToObserve.forEach((element: Element) => {
          this.observer?.observe(element);
        });
        console.log('Observing', elementsToObserve.length, 'elements');
      } else {
        // If no triggers found yet, try again after DOM update
        if (this.posts.length >= 3) {
          setTimeout(() => this.observeElements(), 100);
        }
      }
    }, 100);
  }

  async loadPosts(event?: any) {
    const isRefresh = !!event;

    if (!isRefresh) {
      this.isLoading = true;
    } else {
      this.isRefreshing = true;
    }

    const posts$ = this.apiService.getData();
    const memes$ = this.apiService.getMemes(this.memePage);

    forkJoin([posts$, memes$]).subscribe(async ([posts, memeResponse]) => {
      const bazzarItems: CombinedItem[] = posts.map((p: BazzarItem) => ({ ...p, itemType: 'post' as const }));
      const memes: CombinedItem[] = memeResponse.memeList.map((m: Meme) => ({ ...m, itemType: 'meme' as const }));

      this.allPosts = [...bazzarItems, ...memes];

      // Randomize the entire array first using Fisher-Yates shuffle
      this.shuffleArray(this.allPosts);

      // Load favorites
      await this.loadFavorites();

      // Get first batch with favorites applied
      this.posts = this.getRandomizedPosts(10);

      if (event) {
        event.target.complete();
      }

      // Turn off loading states
      this.isLoading = false;
      this.isRefreshing = false;

      // Re-setup observers after posts are loaded
      setTimeout(() => this.observeElements(), 200);
    });
  }

  // Fisher-Yates shuffle algorithm for better randomization
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private getRandomizedPosts(count: number): CombinedItem[] {
    const batch = this.allPosts.slice(0, count);

    // Apply favorites and prepare display properties
    return batch.map(item => {
      if (item.itemType === 'post') {
        const post = item as BazzarItem;
        return {
          ...post,
          isFavorite: this.favoritePostIds.has(post.id),
          image: post.images && post.images.length > 0 ? post.images[0] : 'assets/shared/sampleImage.jpg'
        };
      }
      return item;
    });
  }

  async loadFavorites(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.favoritePostIds.clear();
      return;
    }

    try {
      const favoritesRef = collection(this.firestore, `users/${user.uid}/favorites`);
      const favoritesQuery = query(favoritesRef);
      const querySnapshot = await getDocs(favoritesQuery);

      this.favoritePostIds.clear();
      querySnapshot.forEach((doc) => {
        this.favoritePostIds.add(doc.id);
      });

      console.log('Loaded favorites:', this.favoritePostIds.size, 'posts');
    } catch (error) {
      console.error('Error loading favorites:', error);
      this.favoritePostIds.clear();
    }
  }

  private loadMorePosts() {
    if (this.isLoadingMore || this.allPosts.length === 0) {
      console.log('Already loading or no posts available');
      return;
    }

    this.isLoadingMore = true;
    console.log('Loading more posts! Current:', this.posts.length, 'Total available:', this.allPosts.length);

    const currentLength = this.posts.length;

    // Check if we've shown all posts
    if (currentLength >= this.allPosts.length) {
      // Load more memes if available
      this.memePage++;
      this.apiService.getMemes(this.memePage).subscribe(memeResponse => {
        if (memeResponse.memeList.length > 0) {
          const memes: CombinedItem[] = memeResponse.memeList.map((m: Meme) => ({ ...m, itemType: 'meme' as const }));
          this.allPosts.push(...memes);
          this.shuffleArray(this.allPosts);
          this.continueLoadingMorePosts();
        } else {
          // No more memes, just reshuffle existing posts
          this.shuffleArray(this.allPosts);
          console.log('Re-shuffled posts for infinite scroll');
          this.continueLoadingMorePosts();
        }
      });
    } else {
      this.continueLoadingMorePosts();
    }
  }

  private continueLoadingMorePosts() {
    const currentLength = this.posts.length;
    // Calculate which posts to show next (wrap around if needed)
    const startIndex = currentLength % this.allPosts.length;
    const endIndex = Math.min(startIndex + 5, this.allPosts.length);

    // Get the next batch
    let morePosts = this.allPosts.slice(startIndex, endIndex).map(item => {
      if (item.itemType === 'post') {
        const post = item as BazzarItem;
        return {
          ...post,
          isFavorite: this.favoritePostIds.has(post.id),
          image: post.images && post.images.length > 0 ? post.images[0] : 'assets/shared/sampleImage.jpg'
        };
      }
      return item;
    });

    // If we didn't get enough posts (wrapped around), get more from the beginning
    if (morePosts.length < 5 && this.allPosts.length >= 5) {
      const remaining = 5 - morePosts.length;
      const additionalPosts = this.allPosts.slice(0, remaining).map(item => {
        if (item.itemType === 'post') {
          const post = item as BazzarItem;
          return {
            ...post,
            isFavorite: this.favoritePostIds.has(post.id),
            image: post.images && post.images.length > 0 ? post.images[0] : 'assets/shared/sampleImage.jpg'
          };
        }
        return item;
      });
      morePosts = [...morePosts, ...additionalPosts];
    }

    console.log('Adding', morePosts.length, 'more posts. New total:', currentLength + morePosts.length);
    this.posts.push(...morePosts);

    // Re-observe triggers after adding new posts
    setTimeout(() => {
      this.observeElements();
      this.isLoadingMore = false;
    }, 100);
  }


  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    console.log('DoomiesPage: Pull-to-refresh triggered');
    this.loadPosts(event);
  }

  async toggleFavorite(post: BazzarItem, event: Event) {
    event.stopPropagation();

    const user = this.authService.currentUser();
    if (!user) {
      console.error('Cannot toggle favorite: User not logged in');
      return;
    }

    // Toggle the UI immediately for better UX
    post.isFavorite = !post.isFavorite;

    try {
      const favoriteDocRef = doc(this.firestore, `users/${user.uid}/favorites/${post.id}`);

      if (post.isFavorite) {
        // Add to favorites
        await setDoc(favoriteDocRef, {
          postId: post.id,
          title: post.title,
          image: post.image,
          favoritedAt: new Date()
        });
        this.favoritePostIds.add(post.id);
        console.log('Added to favorites:', post.id);
      } else {
        // Remove from favorites
        await deleteDoc(favoriteDocRef);
        this.favoritePostIds.delete(post.id);
        console.log('Removed from favorites:', post.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert the UI change on error
      post.isFavorite = !post.isFavorite;
    }
  }

  async openDetailModal(post: BazzarItem, event: Event) {
    event.stopPropagation();
    
    // Prevent double-clicking from opening multiple modals
    if (this.isModalOpen) {
      console.log('Modal already open, ignoring click');
      return;
    }
    
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: PostDetailModalComponent,
      componentProps: {
        postId: post.id,
        focusComment: false
      }
    });

    modal.onDidDismiss().then(() => {
      console.log('Detail modal dismissed');
      this.isModalOpen = false;
    });

    return await modal.present();
  }

  async openCommentModal(post: BazzarItem, event: Event) {
    event.stopPropagation();
    
    // Prevent double-clicking from opening multiple modals
    if (this.isModalOpen) {
      console.log('Modal already open, ignoring click');
      return;
    }
    
    this.isModalOpen = true;

    const modal = await this.modalController.create({
      component: PostDetailModalComponent,
      componentProps: {
        postId: post.id,
        focusComment: true
      }
    });

    modal.onDidDismiss().then(() => {
      console.log('Comment modal dismissed');
      this.isModalOpen = false;
    });

    return await modal.present();
  }

  async toggleMute(event: Event) {
    event.stopPropagation();
    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      await TextToSpeech.stop();
    } else {
      if (this.currentlyVisiblePost) {
        if (this.currentlyVisiblePost.itemType === 'post') {
          this.speakPost(this.currentlyVisiblePost as BazzarItem);
        } else if (this.currentlyVisiblePost.itemType === 'meme') {
          this.speakMeme(this.currentlyVisiblePost as Meme);
        }
      }
    }
  }

  private async speakPost(post: BazzarItem) {
    const textToSpeak = `${post.title}. ${post.description}. ${post.text}`;
    await TextToSpeech.speak({
      text: textToSpeak,
      lang: 'de-de',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      category: 'ambient',
    });
  }

  private async speakMeme(meme: Meme) {
    const textToSpeak = meme.title;
    await TextToSpeech.speak({
      text: textToSpeak,
      lang: 'de-de',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      category: 'ambient',
    });
  }

  async sharePost(post: BazzarItem, event: Event) {
    event.stopPropagation();

    const shareData = {
      title: post.title,
      text: post.description,
      url: window.location.origin + '/bazzar?postId=' + post.id
    };

    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share(shareData);
        console.log('Post shared successfully');
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(shareData.url);
        console.log('Link copied to clipboard');
        // TODO: Show toast notification
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  }

  openMemeLink(post: Meme, event: Event) {
    event.stopPropagation();
    window.open(post.permalink, '_blank');
  }

  asPost(item: CombinedItem): BazzarItem | null {
    return item.itemType === 'post' ? (item as BazzarItem) : null;
  }

  asMeme(item: CombinedItem): Meme | null {
    return item.itemType === 'meme' ? (item as Meme) : null;
  }

  getCurrentImageIndex(postId: string): number {
    return this.currentImageIndices.get(postId) || 0;
  }

  getCurrentImage(post: BazzarItem): string {
    if (!post.images || post.images.length === 0) {
      return 'assets/shared/sampleImage.jpg';
    }
    const index = this.getCurrentImageIndex(post.id);
    return post.images[index] || post.images[0];
  }

  hasMultipleImages(post: BazzarItem): boolean {
    return post.images && post.images.length > 1;
  }

  startCarousel(post: BazzarItem) {
    // Don't start if already running or no multiple images
    if (this.carouselIntervals.has(post.id) || !this.hasMultipleImages(post)) {
      console.log(`Carousel not started for post ${post.id}: already running=${this.carouselIntervals.has(post.id)}, hasMultiple=${this.hasMultipleImages(post)}, images=${post.images?.length}`);
      return;
    }

    console.log(`Starting carousel for post ${post.id} with ${post.images.length} images`);

    // Initialize index if not set
    if (!this.currentImageIndices.has(post.id)) {
      this.currentImageIndices.set(post.id, 0);
    }

    // Start auto-rotation every 2 seconds (reduced from 3 for better visibility)
    const interval = setInterval(() => {
      const currentIndex = this.currentImageIndices.get(post.id) || 0;
      const nextIndex = (currentIndex + 1) % post.images.length;
      console.log(`Carousel rotating post ${post.id}: ${currentIndex} -> ${nextIndex}`);
      this.currentImageIndices.set(post.id, nextIndex);
      // Trigger change detection so Angular updates the view
      this.cdr.detectChanges();
    }, 2000);

    this.carouselIntervals.set(post.id, interval);
    console.log(`✓ Carousel interval set for post ${post.id}`);
  }

  stopCarousel(postId: string) {
    const interval = this.carouselIntervals.get(postId);
    if (interval) {
      clearInterval(interval);
      this.carouselIntervals.delete(postId);
    }
  }
}
