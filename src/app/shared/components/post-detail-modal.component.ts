import { Component, OnInit, Input, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonIcon,
  IonContent,
  IonTextarea,
  IonFab,
  IonFabButton,
  ModalController,
  LoadingController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { addIcons } from 'ionicons';
import { close, pencil, person, send, trash, chevronUp, chevronDown } from 'ionicons/icons';
import { BazzarItem, Comment, CreateCommentData, AcceptanceRequest, AcceptedUser } from '../../models/bazzar.interface';
import { UserProfile } from '../../models/user-profile.interface';
import { ApiService } from '../../services/api.service';
import { Authentication } from '../../authentication/authentication';
import { AdminService } from '../../services/admin.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { EditPostModalComponent } from './edit-post-modal.component';

@Component({
  selector: 'app-post-detail-modal',
  templateUrl: './post-detail-modal.component.html',
  styleUrls: ['./post-detail-modal.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButton,
    IonIcon,
    IonContent,
    IonTextarea,
    IonFab,
    IonFabButton
  ]
})
export class PostDetailModalComponent implements OnInit {
  @Input() postId!: string;
  @Input() focusComment: boolean = false;
  @ViewChild(IonTextarea) commentTextarea!: IonTextarea;

  post: BazzarItem | null = null;
  creatorProfile: UserProfile | null = null;
  isLoading: boolean = true;
  commentText: string = '';
  isSubmittingComment: boolean = false;
  showFabList: boolean = false;
  private firestore: Firestore = inject(Firestore);
  private postWasUpdated: boolean = false;
  private postWasDeleted: boolean = false;
  private isEditModalOpen: boolean = false;

  private modalController = inject(ModalController);
  private apiService = inject(ApiService);
  public authService = inject(Authentication);
  public adminService = inject(AdminService);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ close, pencil, person, send, trash, chevronUp, chevronDown });
  }

  async ngOnInit() {
    await this.loadPostDetails();

    // If focusComment flag is set, auto-focus and scroll to comment section
    if (this.focusComment) {
      await this.focusCommentInput();
    }
  }

  async loadPostDetails() {
    this.isLoading = true;
    try {
      const data = await this.apiService.getPostById(this.postId).toPromise();
      if (data) {
        this.post = {
          ...data,
          // Backend already includes acceptance data
          image: data.images && data.images.length > 0 ? data.images[0] : 'assets/shared/sampleImage.jpg',
          tagObjects: data.tags.map(tag => this.createTagObject(tag))
        };

        // Load creator profile from Firestore
        await this.loadCreatorProfile(data.creatorId);
      }
    } catch (error) {
      console.error('Error loading post details:', error);
      await this.showAlert('Fehler', 'Post konnte nicht geladen werden.');
    } finally {
      this.isLoading = false;
    }
  }

  async loadCreatorProfile(creatorId: string) {
    try {
      const userDocRef = doc(this.firestore, `users/${creatorId}`);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        this.creatorProfile = userDoc.data() as UserProfile;
      }
    } catch (error) {
      console.error('Error loading creator profile:', error);
      // Non-critical error, continue without profile
    }
  }

  // Helper method to create tag objects with colors
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
      'seminar': '#E91E63',
      'ludolph': '#FF9800',
      'heizung': '#FF5722',
      'schwanz': '#9C27B0',
      'default': '#607D8B'
    };

    return {
      name: tagName,
      color: tagColors[tagName.toLowerCase()] || tagColors['default']
    };
  }

  dismiss() {
    document.body.classList.remove('post-detail-modal-open');
    this.modalController.dismiss({
      updated: this.postWasUpdated,
      deleted: this.postWasDeleted
    });
  }

  // Check if current user is the post creator
  get isPostCreator(): boolean {
    const user = this.authService.currentUser();
    return user ? user.uid === this.post?.creatorId : false;
  }

  // Check if current user can edit the post (owner or admin)
  get canEditPost(): boolean {
    if (!this.post) return false;
    return this.adminService.canEditContent(this.post.creatorId);
  }

  // Open edit modal
  async openEditModal() {
    if (!this.post) return;
    
    // Prevent double-clicking from opening multiple modals
    if (this.isEditModalOpen) {
      console.log('Edit modal already open, ignoring click');
      return;
    }
    
    this.isEditModalOpen = true;

    // Add blur class to body
    document.body.classList.add('edit-post-modal-open');

    const editModal = await this.modalController.create({
      component: EditPostModalComponent,
      cssClass: 'edit-post-modal',
      componentProps: {
        post: this.post
      }
    });

    editModal.onDidDismiss().then(async (result) => {
      // Remove blur class from body when modal is dismissed
      document.body.classList.remove('edit-post-modal-open');
      
      // Reset modal flag
      this.isEditModalOpen = false;

      if (result.data?.updated) {
        // Post was updated, reload the post details and mark for parent reload
        console.log('Post updated, reloading details...');
        this.postWasUpdated = true;
        await this.loadPostDetails();
      } else if (result.data?.deleted) {
        // Post was deleted, close this modal too and mark for parent reload
        console.log('Post deleted, closing detail modal...');
        this.postWasDeleted = true;
        this.dismiss();
      }
    });

    await editModal.present();
  }

  // Format timestamp to readable format (e.g., "18. Oktober 18:24")
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.toLocaleString('de-DE', { month: 'long' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}. ${month} ${hours}:${minutes}`;
  }

  // Get creator full name from Firestore profile
  getCreatorName(): string {
    if (this.creatorProfile) {
      return `${this.creatorProfile.vorname} ${this.creatorProfile.name}`;
    }
    // Fallback to email if profile not loaded
    if (!this.post?.creatorMail) return 'Unbekannt';
    const nameMatch = this.post.creatorMail.match(/^([^@]+)/);
    return nameMatch ? nameMatch[1] : this.post.creatorMail;
  }

  // Check if the post is a Seminar post
  isSeminarPost(): boolean {
    if (!this.post) return false;

    const searchTerm = 'seminar';

    // Check in tags
    if (this.post.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
      return true;
    }

    // Check in title, description, and text
    return (
      this.post.title?.toLowerCase().includes(searchTerm) ||
      this.post.description?.toLowerCase().includes(searchTerm) ||
      this.post.text?.toLowerCase().includes(searchTerm)
    );
  }

  // Format date for display (e.g., "18. Oktober 18:24")
  formatCreationDate(): string {
    if (!this.post?.created_at) return '';
    const date = new Date(this.post.created_at);
    const day = date.getDate();
    const month = date.toLocaleString('de-DE', { month: 'long' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}. ${month} ${hours}:${minutes}`;
  }

  // Get commenter display name
  getCommenterDisplayName(comment: Comment): string {
    return comment.commenterName || comment.commenterMail.split('@')[0] || 'Unbekannt';
  }

  // Check if current user can delete a comment (owner or admin)
  canDeleteComment(comment: Comment): boolean {
    return this.adminService.canDeleteContent(comment.creatorId);
  }

  // Add a new comment
  async addComment() {
    if (!this.commentText.trim()) {
      return;
    }

    const user = this.authService.currentUser();
    const userProfile = this.authService.currentUserProfile();

    if (!user) {
      await this.showAlert('Fehler', 'Sie müssen angemeldet sein, um einen Kommentar zu schreiben.');
      return;
    }

    this.isSubmittingComment = true;

    try {
      const commentData: CreateCommentData = {
        creatorId: user.uid,
        message: this.commentText.trim(),
        commenterMail: user.email || '',
        commenterName: userProfile ? `${userProfile.vorname} ${userProfile.name}` : user.email || 'Unbekannt'
      };

      await this.apiService.createComment(this.postId, commentData).toPromise();

      // Clear input
      this.commentText = '';

      // Reload post to get updated comments
      await this.loadPostDetails();
    } catch (error) {
      console.error('Error creating comment:', error);
      await this.showAlert('Fehler', 'Kommentar konnte nicht erstellt werden.');
    } finally {
      this.isSubmittingComment = false;
    }
  }

  // Delete a comment
  async deleteComment(comment: Comment) {
    const user = this.authService.currentUser();
    if (!user) {
      await this.showAlert('Fehler', 'Sie müssen angemeldet sein.');
      return;
    }

    if (!this.adminService.canDeleteContent(comment.creatorId)) {
      await this.showAlert('Fehler', 'Sie haben keine Berechtigung, diesen Kommentar zu löschen.');
      return;
    }

    // Show confirmation dialog
    const alert = await this.alertController.create({
      header: 'Kommentar löschen',
      message: 'Möchten Sie diesen Kommentar wirklich löschen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Kommentar wird gelöscht...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.apiService.deleteComment(this.postId, comment.id, user.uid).toPromise();

              // Reload post to get updated comments
              await this.loadPostDetails();
            } catch (error) {
              console.error('Error deleting comment:', error);
              await this.showAlert('Fehler', 'Kommentar konnte nicht gelöscht werden.');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Check if current user has requested acceptance
  get hasUserRequested(): boolean {
    const user = this.authService.currentUser();
    if (!user || !this.post?.acceptanceList) return false;
    return this.post.acceptanceList.some((req: any) => req.userId === user.uid);
  }

  // Toggle FAB list visibility
  toggleFabList() {
    this.showFabList = !this.showFabList;
  }

  // Focus the comment input (Allen Antworten action)
  async focusCommentInput() {
    this.showFabList = false;
    // Wait a bit for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.commentTextarea) {
      // Scroll to comments section - scroll down more
      const commentsSection = document.querySelector('.comment-input-container');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll down an additional amount to show more context
        await new Promise(resolve => setTimeout(resolve, 300));
        window.scrollBy({ top: 100, behavior: 'smooth' });
      }
      // Focus the textarea
      await this.commentTextarea.setFocus();
    }
  }

  // Handle "Nehm ich" button click
  async handleNehmIch() {
    this.showFabList = false;

    if (this.hasUserRequested) {
      // Cancel request
      await this.cancelAcceptanceRequest();
    } else {
      // Send request
      await this.requestToAcceptPost();
    }
  }

  // Send acceptance request (Backend API)
  async requestToAcceptPost() {
    const user = this.authService.currentUser();
    const userProfile = this.authService.currentUserProfile();

    if (!user) {
      await this.showAlert('Fehler', 'Sie müssen angemeldet sein.');
      return;
    }

    if (!this.post) return;

    const loading = await this.loadingController.create({
      message: 'Anfrage wird gesendet...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const userName = userProfile ? `${userProfile.vorname} ${userProfile.name}` : user.email || 'Unbekannt';

      // Initialize acceptanceList if it doesn't exist
      const acceptanceList = this.post.acceptanceList || [];

      // Check if user already requested
      if (acceptanceList.some((req: any) => req.userId === user.uid)) {
        await loading.dismiss();
        await this.showAlert('Info', 'Sie haben bereits eine Anfrage gesendet.');
        return;
      }

      // Add new request to acceptance list
      const newRequest: AcceptanceRequest = {
        userId: user.uid,
        userName: userName,
        requestedAt: new Date().toISOString()
      };

      const updatedPost = {
        ...this.post,
        acceptanceList: [...acceptanceList, newRequest]
      };

      // Update post via backend
      await this.apiService.updatePost(this.post.creatorId, this.post.id, {
        creatorId: this.post.creatorId,
        creatorMail: this.post.creatorMail,
        title: this.post.title,
        description: this.post.description,
        tags: this.post.tags || [],
        text: this.post.text,
        payPalMail: this.post.payPalMail || '',
        images: this.post.images || [],
        comments: this.post.comments || [],
        IsTerminated: this.post.isTerminated || false,  // Backend expects PascalCase
        acceptanceList: updatedPost.acceptanceList,
        acceptedUser: this.post.acceptedUser || {}
      }).toPromise();

      // Reload post to get updated acceptance requests
      await this.loadPostDetails();
      await this.showToast('Anfrage gesendet!');
    } catch (error) {
      console.error('Error sending acceptance request:', error);
      await this.showAlert('Fehler', 'Anfrage konnte nicht gesendet werden.');
    } finally {
      await loading.dismiss();
    }
  }

  // Cancel acceptance request (Backend API)
  async cancelAcceptanceRequest() {
    const user = this.authService.currentUser();
    if (!user || !this.post) return;

    // Show confirmation
    const alert = await this.alertController.create({
      header: 'Anfrage stornieren',
      message: 'Möchten Sie Ihre Anfrage wirklich stornieren?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        },
        {
          text: 'Stornieren',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Anfrage wird storniert...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              // Remove user's request from acceptance list
              const currentAcceptanceList = this.post!.acceptanceList || [];
              const updatedRequests = currentAcceptanceList.filter((req: any) => req.userId !== user.uid);

              // Update post via backend
              await this.apiService.updatePost(this.post!.creatorId, this.post!.id, {
                creatorId: this.post!.creatorId,
                creatorMail: this.post!.creatorMail,
                title: this.post!.title,
                description: this.post!.description,
                tags: this.post!.tags || [],
                text: this.post!.text,
                payPalMail: this.post!.payPalMail || '',
                images: this.post!.images || [],
                comments: this.post!.comments || [],
                IsTerminated: this.post!.isTerminated || false,  // Backend expects PascalCase
                acceptanceList: updatedRequests,
                acceptedUser: this.post!.acceptedUser || {}
              }).toPromise();

              // Reload post
              await this.loadPostDetails();
              await this.showToast('Anfrage storniert', 'warning');
            } catch (error) {
              console.error('Error cancelling request:', error);
              await this.showAlert('Fehler', 'Anfrage konnte nicht storniert werden.');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Accept a user's request (owner action - Backend API)
  async acceptUserRequest(request: AcceptanceRequest) {
    if (!this.post) return;

    const user = this.authService.currentUser();
    if (!user) return;

    // Show confirmation
    const alert = await this.alertController.create({
      header: 'Anfrage akzeptieren',
      message: `Möchten Sie die Anfrage von ${request.userName} akzeptieren? Dies schließt den Post ab.`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        },
        {
          text: 'Akzeptieren',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Anfrage wird akzeptiert...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              // Create accepted user object and terminate post
              const acceptedUser: AcceptedUser = {
                userId: request.userId,
                userName: request.userName,
                acceptedAt: new Date().toISOString()
              };

              // Update post via backend
              await this.apiService.updatePost(this.post!.creatorId, this.post!.id, {
                creatorId: this.post!.creatorId,
                creatorMail: this.post!.creatorMail,
                title: this.post!.title,
                description: this.post!.description,
                tags: this.post!.tags || [],
                text: this.post!.text,
                payPalMail: this.post!.payPalMail || '',
                images: this.post!.images || [],
                comments: this.post!.comments || [],
                IsTerminated: true,  // Backend expects PascalCase
                acceptanceList: this.post!.acceptanceList || [],
                acceptedUser: acceptedUser
              }).toPromise();

              // Reload post to show terminated state
              await this.loadPostDetails();
              this.postWasUpdated = true;
              await this.showToast('Post abgeschlossen!');
            } catch (error) {
              console.error('Error accepting request:', error);
              await this.showAlert('Fehler', 'Anfrage konnte nicht akzeptiert werden.');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
