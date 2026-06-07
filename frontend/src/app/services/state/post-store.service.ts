import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Post } from '../../models/post.model';

/**
 * Post-related shared state: the last updated post, "posts available" / "my post"
 * flags, and the post search query. Split out of SharedDataService.
 */
@Injectable({ providedIn: 'root' })
export class PostStore {
  private readonly updatedPost = new BehaviorSubject<Post | null>(null);
  private readonly posts = new BehaviorSubject<boolean>(false);
  private readonly myPost = new BehaviorSubject<boolean>(false);
  private readonly postSearchQuery = new BehaviorSubject<string>('');

  setPost(post: Post | null): void {
    this.updatedPost.next(post);
  }

  getPost(): Observable<Post | null> {
    return this.updatedPost.asObservable();
  }

  setPostAvailable(value: boolean): void {
    this.posts.next(value);
  }

  getPostAvailable(): Observable<boolean> {
    return this.posts.asObservable();
  }

  setMyPost(value: boolean): void {
    this.myPost.next(value);
  }

  getMyPost(): Observable<boolean> {
    return this.myPost.asObservable();
  }

  setPostSearchQuery(query: string): void {
    this.postSearchQuery.next(query);
  }

  getPostSearchQuery(): Observable<string> {
    return this.postSearchQuery.asObservable();
  }
}
