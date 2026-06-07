import { Injectable, Signal, WritableSignal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from '../../models/post.model';
import { Wall, BackgroundTheme, User } from '../../shared/models';
import { UiStore } from '../state/ui-store.service';
import { UserStore } from '../state/user-store.service';
import { WallStore, StylePreview } from '../state/wall-store.service';
import { PostStore } from '../state/post-store.service';

/**
 * Backwards-compatible facade over the focused state stores (Ui/User/Wall/Post).
 *
 * The state itself now lives in those stores — this class only delegates so that
 * the ~30 existing consumers keep working unchanged. New code should inject the
 * relevant store (UiStore / UserStore / WallStore / PostStore) directly instead
 * of this facade, and consumers can be migrated off it incrementally.
 */
@Injectable({ providedIn: 'root' })
export class SharedDataService {
  private readonly ui = inject(UiStore);
  private readonly userStore = inject(UserStore);
  private readonly wallStore = inject(WallStore);
  private readonly postStore = inject(PostStore);

  // --- UI ---
  get context(): WritableSignal<string> { return this.ui.context; }
  get message(): WritableSignal<string> { return this.ui.message; }
  get isOpen(): WritableSignal<boolean> { return this.ui.isOpen; }
  setContext(context: string): void { this.ui.setContext(context); }
  setMessage(message: string): void { this.ui.setMessage(message); }
  toggle(): void { this.ui.toggle(); }
  setIsPreview(preview: boolean): void { this.ui.setIsPreview(preview); }
  getIsPreview() { return this.ui.getIsPreview(); }

  // --- User ---
  get userEmail(): WritableSignal<string> { return this.userStore.userEmail; }
  get userData$(): Observable<Partial<User>> { return this.userStore.userData$; }
  updateUserName(newData: Partial<User>): void { this.userStore.updateUserName(newData); }
  setUpdateUserProfile(changed: Blob | null): void { this.userStore.setUpdateUserProfile(changed); }
  getUpdateUserProfile() { return this.userStore.getUpdateUserProfile(); }
  setUserData(data: User | null): void { this.userStore.setUserData(data); }
  getUserData(): Observable<User | null> { return this.userStore.getUserData(); }
  setUserEmail(email: string): void { this.userStore.setUserEmail(email); }
  getUserNameCache(): Map<string, Observable<string>> { return this.userStore.getUserNameCache(); }
  setUserNameCache(email: string, observable: Observable<string>): void {
    this.userStore.setUserNameCache(email, observable);
  }

  // --- Wall ---
  get themes(): Signal<BackgroundTheme[]> { return this.wallStore.themes; }
  get stylePreview$(): Observable<StylePreview | null> { return this.wallStore.stylePreview$; }
  setStylePreview(v: StylePreview | null): void { this.wallStore.setStylePreview(v); }
  clearStylePreview(): void { this.wallStore.clearStylePreview(); }
  setWallDetails(details: Wall | null): void { this.wallStore.setWallDetails(details); }
  getWallDetails(): Observable<Wall | null> { return this.wallStore.getWallDetails(); }
  updateWallDetailsPartially(updatedWallDetails: Partial<Wall>): void {
    this.wallStore.updateWallDetailsPartially(updatedWallDetails);
  }
  setThemes(themes: BackgroundTheme[]): void { this.wallStore.setThemes(themes); }
  setSendEmail(value: boolean): void { this.wallStore.setSendEmail(value); }
  getSendMail(): Observable<boolean> { return this.wallStore.getSendMail(); }
  setWallSearchQuery(query: string): void { this.wallStore.setWallSearchQuery(query); }
  getWallSearchQuery(): Observable<string> { return this.wallStore.getWallSearchQuery(); }

  // --- Post ---
  setPost(post: Post | null): void { this.postStore.setPost(post); }
  getPost(): Observable<Post | null> { return this.postStore.getPost(); }
  setPostAvailable(value: boolean): void { this.postStore.setPostAvailable(value); }
  getPostAvailable(): Observable<boolean> { return this.postStore.getPostAvailable(); }
  setMyPost(value: boolean): void { this.postStore.setMyPost(value); }
  getMyPost(): Observable<boolean> { return this.postStore.getMyPost(); }
  setPostSearchQuery(query: string): void { this.postStore.setPostSearchQuery(query); }
  getPostSearchQuery(): Observable<string> { return this.postStore.getPostSearchQuery(); }
}
