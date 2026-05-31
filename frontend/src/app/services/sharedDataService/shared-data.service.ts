import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Post } from '../../models/post.model';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {
  context = signal<string>('');

  message = signal<string>('');
  
  private userNameSubject = new BehaviorSubject<any>({});

  userData$ = this.userNameSubject.asObservable();

  private userProfilePic: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  private userDetailsSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  userEmail = signal<string>('');

  private isPreview: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  isOpen = signal<boolean>(false);

  private wallDetailsSubject = new BehaviorSubject<any>(null);

  themes = signal<any[]>([]);

  private updatedPost = new BehaviorSubject<any>(null);

  private sendUserMail = new BehaviorSubject<boolean>(false);

  private userNameCache: Map<string, Observable<string>> = new Map<string, Observable<string>>();

  private posts= new BehaviorSubject<boolean>(false);

  private myPost= new BehaviorSubject<boolean>(false);

  constructor() { }

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

  updateUserName(newData: any) {
    const currentUserData = this.userDetailsSubject.value;

    const updatedUserData = {
      ...currentUserData,
      firstname: newData.firstname !== undefined ? newData.firstname : currentUserData.firstname,
      lastname: newData.lastname !== undefined ? newData.lastname : currentUserData.lastname,
    };

    this.userDetailsSubject.next(updatedUserData);

    this.userNameSubject.next({
      firstname: updatedUserData.firstname,
      lastname: updatedUserData.lastname,
    });
  }

  setUpdateUserProfile(changed: any) {
    this.userProfilePic.next(changed);
  }

  getUpdateUserProfile(){
    return this.userProfilePic.asObservable();
  }

  setUserData(data: any) {
    this.userDetailsSubject.next(data);
  }

  getUserData(): Observable<any> {
    return this.userDetailsSubject.asObservable();
  }

  setUserEmail(email: string): void {
    this.userEmail.set(email);
  }

  toggle() {
    this.isOpen.set(!this.isOpen());
  }

  setWallDetails(details: any): void {
    this.wallDetailsSubject.next(details);
  }

  getWallDetails(): Observable<any> {
    return this.wallDetailsSubject.asObservable();
  }

  updateWallDetailsPartially(updatedWallDetails: any): void {
    const currentDetails = this.wallDetailsSubject.getValue();
    if (currentDetails) {
      const updatedDetails = {
        ...currentDetails,
        ...updatedWallDetails
      };
      this.wallDetailsSubject.next(updatedDetails);
    }
  }

  setThemes(themes: any[]): void {
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
