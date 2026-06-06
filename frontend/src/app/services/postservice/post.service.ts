import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { AuthService } from '../authservice/auth.service';
import { ReactionType } from '../../shared/models';
import { Post } from '../../models/post.model';
import { retryWithBackoff } from '../../utils/http-retry.util';

@Injectable({
  providedIn: 'root',
})
export class PostService {

  private postServiceBaseUrl = SERVICE_BASE_URL + `/api/walls`;

  constructor(private http: HttpClient,
    private authService: AuthService) { }

  createPost(wallId: string, formData: FormData): Observable<Post> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<Post>(`${this.postServiceBaseUrl}/${wallId}/posts`, formData, { headers });
  }

  getPost(wallId: string, postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`).pipe(retryWithBackoff());
  }

  getPostsForWall(wallId: string, page: number, pageSize?: number): Observable<Post[]> {
    let params = new HttpParams()
    .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get<Post[]>(`${this.postServiceBaseUrl}/${wallId}/posts`, { params }).pipe(retryWithBackoff());
  }

  getPostsForEmail(wallId: string, _userEmail: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.postServiceBaseUrl}/${wallId}/posts/mail`).pipe(retryWithBackoff());
  }

  updatePost(wallId: string, postId: string, postData: Partial<Post> | FormData | Record<string, unknown>): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`, postData);
  }

  deletePost(wallId: string, postId: string): Observable<void> {
    return this.http.delete<void>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`);
  }

  reportPost(wallId: string, postId: string): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/report`, {});
  }

  unreportPost(wallId: string, postId: string): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/unreport`, {});
  }

  getPendingPosts(wallId: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.postServiceBaseUrl}/${wallId}/posts/pending`).pipe(retryWithBackoff());
  }

  approvePost(wallId: string, postId: string): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/approve`, {});
  }

  rejectPost(wallId: string, postId: string): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/reject`, {});
  }

  pinPost(wallId: string, postId: string, pinned: boolean): Observable<Post> {
    return this.http.put<Post>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/pin`, { pinned });
  }

  react(wallId: string, postId: string, reactionType: ReactionType | string): Observable<void> {
    return this.http.post<void>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/react/${reactionType}`, {});
  }

  removeReaction(wallId: string, postId: string, reactionType: ReactionType | string): Observable<void> {
    return this.http.delete<void>(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/react/${reactionType}`, {});
  }
}
