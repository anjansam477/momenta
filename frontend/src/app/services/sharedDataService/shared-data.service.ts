import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Post } from '../../models/post.model';
import { Wall } from '../../shared/models';
import { User, BackgroundTheme } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {
  context = signal<string>('');

  message = signal<string>('');
  
  private userNameSubject = new BehaviorSubject<Partial<User>>({});

  userData$ = this.userNameSubject.asObservable();

  private userProfilePic = new BehaviorSubject<Blob | null>(null);

  private userDetailsSubject = new BehaviorSubject<User | null>(null);

  userEmail = signal<string>('');

  private isPreview: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  isOpen = signal<boolean>(false);

  private wallDetailsSubject = new BehaviorSubject<Wall | null>(null);

  private stylePreviewSubject = new BehaviorSubject<{ bgColor?: string; font?: string; textColor?: string } | null>(null);
  stylePreview$ = this.stylePreviewSubject.asObservable();
  setStylePreview(v: { bgColor?: string; font?: string; textColor?: string } | null) { this.stylePreviewSubject.next(v); }
  clearStylePreview() { this.stylePreviewSubject.next(null); }

  themes = signal<BackgroundTheme[]>([]);

  private updatedPost = new BehaviorSubject<Post | null>(null);

  private sendUserMail = new BehaviorSubject<boolean>(false);

  private userNameCache: Map<string, Observable<string>> = new Map<string, Observable<string>>();

  private posts= new BehaviorSubject<boolean>(false);

  private myPost= new BehaviorSubject<boolean>(false);

  private postSearchQuery = new BehaviorSubject<string>('');

  constructor() { }

  setPostSearchQuery(query: string) { this.postSearchQuery.next(query); }
  getPostSearchQuery(): Observable<string> { return this.postSearchQuery.asObservable(); }

  private wallSearchQuery = new BehaviorSubject<string>('');
  setWallSearchQuery(query: string) { this.wallSearchQuery.next(query); }
  getWallSearchQuery(): Observable<string> { return this.wallSearchQuery.asObservable(); }

  setContext(context: string) {
    this.context.set(context);
  }

  setMessage(message: string) {
    this.message.set(message);
  }

  setIsPreview(preview: boolean){
    this.isPreview.next(preview);
  }

  getIsPreview(){
    return this.isPreview.asObservable();
  }

  updateUserName(newData: Partial<User>) {
    const currentUserData = this.userDetailsSubject.value ?? {} as User;

    const updatedUserData = {
      ...currentUserData,
      firstname: newData.firstname !== undefined ? newData.firstname : currentUserData.firstname,
      lastname: newData.lastname !== undefined ? newData.lastname : currentUserData.lastname,
    };

    this.userDetailsSubject.next(updatedUserData as User);

    this.userNameSubject.next({
      firstname: updatedUserData.firstname,
      lastname: updatedUserData.lastname,
    });
  }

  setUpdateUserProfile(changed: Blob | null) {
    this.userProfilePic.next(changed);
  }

  getUpdateUserProfile(){
    return this.userProfilePic.asObservable();
  }

  setUserData(data: User | null) {
    this.userDetailsSubject.next(data);
  }

  getUserData(): Observable<User | null> {
    return this.userDetailsSubject.asObservable();
  }

  setUserEmail(email: string): void {
    this.userEmail.set(email);
  }

  toggle() {
    this.isOpen.set(!this.isOpen());
  }

  setWallDetails(details: Wall | null): void {
    this.wallDetailsSubject.next(details);
  }

  getWallDetails(): Observable<Wall | null> {
    return this.wallDetailsSubject.asObservable();
  }

  updateWallDetailsPartially(updatedWallDetails: Partial<Wall>): void {
    const currentDetails = this.wallDetailsSubject.getValue();
    if (currentDetails) {
      const updatedDetails = {
        ...currentDetails,
        ...updatedWallDetails
      };
      this.wallDetailsSubject.next(updatedDetails);
    }
  }

  setThemes(themes: BackgroundTheme[]): void {
    this.themes.set(themes);
  }

  setPost(post: Post | null){
    this.updatedPost.next(post);
  }

  getPost(): Observable<Post | null>{
    return this.updatedPost.asObservable();
  }

  getUserNameCache(): Map<string, Observable<string>> {
    return this.userNameCache;
  }

  setUserNameCache(email: string, observable: Observable<string>): void {
    this.userNameCache.set(email, observable);
  }

  setSendEmail(value: boolean) {
    this.sendUserMail.next(value);
  }

  getSendMail(): Observable<boolean>{
    return this.sendUserMail.asObservable();
  }

  setPostAvailable(value: boolean) {
    this.posts.next(value);
  }

  getPostAvailable(): Observable<boolean>{
    return this.posts.asObservable();
  }

  setMyPost(value: boolean) {
    this.myPost.next(value);
  }

  getMyPost(): Observable<boolean>{
    return this.myPost.asObservable();
  }
}
