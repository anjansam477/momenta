import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { AuthService } from '../authservice/auth.service';
import { ReactionType } from '../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class PostService {

  /**
   * Base Url to handle all post-service requests.
  */
  private postServiceBaseUrl = SERVICE_BASE_URL + `/api/walls`;

  constructor(private http: HttpClient, 
    private authService: AuthService) { }

  /**
   * Create post in a respective wall
   * @param postData - consist all post information including wallId
   * @returns 
   */
  createPost(wallId: string, formData: FormData): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.post(`${this.postServiceBaseUrl}/${wallId}/posts`, formData,  { headers });
  }

  /**
   * Get details of a specific post
   * @param postId 
   * @returns 
   */
  getPost(wallId: string, postId: string): Observable<any> {
    return this.http.get(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`);
  }

  getPostsForWall(wallId: string, page: number, pageSize?: number): Observable<any> {
    let params = new HttpParams()
    .set('page', page.toString());
    
    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get(`${this.postServiceBaseUrl}/${wallId}/posts`,{ params });
  }

  getPostsForEmail(wallId: string, userEmail: string):Observable<any>{
    return this.http.get(`${this.postServiceBaseUrl}/${wallId}/posts/mail`);
  }

  /**
   * Update post details
   * @param postId 
   * @param postData - updated post details
   * @returns 
   */
  updatePost(wallId: string, postId: string, postData: any): Observable<any> {
    return this.http.put(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`, postData);
  }

  /**
   * Delete respective post, can be performed only by wall creator
   * @param postId 
   * @returns 
   */
  deletePost(wallId: string, postId: string): Observable<any> {
    return this.http.delete(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}`);
  }

  reportPost(wallId: string, postId: string): Observable<any> {
    return this.http.put(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/report`,{});
  }

  /**
   * Unreport post, can be performed by only wall-creator
   * @param postId 
   * @returns 
   */
  unreportPost(wallId: string, postId: string): Observable<any> {
    return this.http.put(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/unreport`, {});
  }

  react(wallId: string, postId: string, reactionType: ReactionType | string){
    return this.http.post(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/react/${reactionType}`, {});
  }

  removeReaction(wallId: string, postId: string, reactionType: ReactionType | string){
    return this.http.delete(`${this.postServiceBaseUrl}/${wallId}/posts/${postId}/react/${reactionType}`, {});
  }
}
