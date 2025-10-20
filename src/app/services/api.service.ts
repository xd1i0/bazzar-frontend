import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BazzarItem, CreateCommentData } from '../models/bazzar.interface';
import { MemeResponse } from '../models/meme.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  private readonly API_URL = `${environment.api.baseUrl}/${environment.api.version}`;

  // Example: GET request to a protected endpoint
  // The auth interceptor will automatically add the Authorization header
  getData(): Observable<any> {
    return this.http.get(`${this.API_URL}/posts`);
  }

  getMemes(page: number): Observable<MemeResponse> {
    return this.http.get<MemeResponse>(`${this.API_URL}/memes/${page}`);
  }

  // GET request to fetch a single post by ID
  getPostById(postId: string): Observable<BazzarItem> {
    return this.http.get<BazzarItem>(`${this.API_URL}/posts/${postId}`);
  }

  // GET request to fetch all available tags
  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/posts/tags`);
  }

  // GET request to fetch posts by user ID
  getUserPosts(userId: string): Observable<BazzarItem[]> {
    return this.http.get<BazzarItem[]>(`${this.API_URL}/users/${userId}/posts`);
  }

  // GET request to fetch posts where user was accepted
  getUserAcceptedPosts(userId: string): Observable<BazzarItem[]> {
    return this.http.get<BazzarItem[]>(`${this.API_URL}/users/${userId}/acceptedPosts`);
  }

  // POST request to create a new post
  createPost(post: any): Observable<any> {
    return this.http.post(`${this.API_URL}/posts`, post);
  }

  // POST request to create a comment on a post
  createComment(postId: string, commentData: CreateCommentData): Observable<any> {
    return this.http.post(`${this.API_URL}/posts/${postId}/comments`, commentData);
  }

  // DELETE request to delete a comment from a post
  deleteComment(postId: string, commentId: string, commentCreatorId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/posts/${postId}/comments/${commentId}/${commentCreatorId}`);
  }

  // PATCH request to update a post
  updatePost(creatorId: string, postId: string, postData: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/users/${creatorId}/${postId}`, postData);
  }

  // DELETE request to delete a post
  deletePost(creatorId: string, postId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/${creatorId}/${postId}`);
  }

  // Example: POST request to a protected endpoint
  createItem(item: any): Observable<any> {
    return this.http.post(`${this.API_URL}/items`, item);
  }

  // Example: PUT request to a protected endpoint
  updateItem(id: string, item: any): Observable<any> {
    return this.http.put(`${this.API_URL}/items/${id}`, item);
  }

  // Example: DELETE request to a protected endpoint
  deleteItem(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/items/${id}`);
  }
}
