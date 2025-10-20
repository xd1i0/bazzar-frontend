import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonRefresher, IonRefresherContent, IonIcon, IonList, IonItem, IonLabel, IonThumbnail, IonNote } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { Authentication } from '../../authentication/authentication';
import { BazzarItem, Comment, AcceptanceRequest } from '../../models/bazzar.interface';

interface Notification {
  id: string;
  type: 'request' | 'comment';
  postId: string;
  postTitle: string;
  postImage: string;
  userName: string;
  timestamp: string;
  message?: string; // For comments
}

@Component({
  selector: 'app-benachrichtigungen',
  templateUrl: './nachrichten.page.html',
  styleUrls: ['./nachrichten.page.scss'],
  imports: [CommonModule, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonList, IonItem, IonLabel, IonThumbnail, IonNote],
})
export class BenachrichtigungenPage implements OnInit {
  notifications: Notification[] = [];
  isLoading = true;
  isRefreshing = false;

  private apiService = inject(ApiService);
  private authService = inject(Authentication);
  private router = inject(Router);

  ngOnInit() {
    this.loadNotifications();
  }

  async loadNotifications(isRefresh = false) {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.isLoading = false;
      return;
    }

    if (!isRefresh) {
      this.isLoading = true;
    }

    try {
      // Fetch user's posts
      const userPosts = await this.apiService.getUserPosts(currentUser.uid).toPromise();

      if (!userPosts) {
        this.notifications = [];
        return;
      }

      // Transform posts into notifications
      const notificationsList: Notification[] = [];

      userPosts.forEach((post: BazzarItem) => {
        // Skip notifications for terminated posts
        if (post.isTerminated) {
          return;
        }

        // Add notifications for acceptance requests
        if (post.acceptanceList && post.acceptanceList.length > 0) {
          post.acceptanceList.forEach((request: AcceptanceRequest) => {
            notificationsList.push({
              id: `${post.id}-request-${request.userId}`,
              type: 'request',
              postId: post.id,
              postTitle: post.title,
              postImage: post.images?.[0] || 'assets/shared/sampleImage.jpg',
              userName: request.userName,
              timestamp: request.requestedAt,
            });
          });
        }

        // Add notifications for comments
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach((comment: Comment) => {
            // Only show comments from other users (not the post owner)
            if (comment.creatorId !== currentUser.uid) {
              notificationsList.push({
                id: `${post.id}-comment-${comment.id}`,
                type: 'comment',
                postId: post.id,
                postTitle: post.title,
                postImage: post.images?.[0] || 'assets/shared/sampleImage.jpg',
                userName: comment.commenterName,
                timestamp: comment.createdAt,
                message: comment.message,
              });
            }
          });
        }
      });

      // Sort by timestamp (most recent first)
      notificationsList.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      this.notifications = notificationsList;
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
    }
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    this.isRefreshing = true;
    await this.loadNotifications(true);
    event.target.complete();
  }

  // Format timestamp to relative time
  formatTimestamp(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'gerade eben';
    } else if (diffInMinutes < 60) {
      return `vor ${diffInMinutes} Min.`;
    } else if (diffInHours < 24) {
      return `vor ${diffInHours} Std.`;
    } else if (diffInDays === 1) {
      return 'vor 1 Tag';
    } else if (diffInDays < 7) {
      return `vor ${diffInDays} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  // Navigate to post on Bazzar page
  openNotification(notification: Notification) {
    this.router.navigate(['/bazzar'], { queryParams: { postId: notification.postId } });
  }

  // Reload data
  reloadData() {
    this.loadNotifications();
  }
}
