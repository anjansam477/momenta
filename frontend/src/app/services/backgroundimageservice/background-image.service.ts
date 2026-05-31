import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, shareReplay } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
@Injectable({
  providedIn: 'root'
})
export class BackgroundImageService {

  constructor(private http: HttpClient) { }

  // Default background image
  private readonly defaultBackground: string = 'assets/images/background_images/Default/deafult_background.png';
  
  // This BehaviorSubject object is initialized with the selected background image
  private selectedBgSubject = new BehaviorSubject<string>(this.defaultBackground);
  private themesRequest$?: Observable<any>;

  /**
   * gets the Theme data with its images.
   * @param none
   */
  getThemes(): Observable<any> {
    if (!this.themesRequest$) {
      this.themesRequest$ = this.http.get(`${SERVICE_BASE_URL}/api/themes`).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.themesRequest$;
  }

  getEvents(emailId: string): Observable<any> {
    return this.http.get(`${SERVICE_BASE_URL}/api/events/${emailId}`);
  }

  /**
   *  This method allows other components to subscribe to this behaviour subject, enabling them to receive updates when the selected background image changes.
   * @returns selectedBgSubject
   */
  getSelectedBgSubject(): Observable<string> {
    return this.selectedBgSubject.asObservable().pipe(
      map((bg) => bg || this.defaultBackground)
    );
  }

  /**
   *  This method updates selectedBackground with a new image source. It then calls setSelectedBgSubject() to notify all subscribers of this change. 
   * @param imageSrc string
   * @returns void
   */
  setSelectedBackground(imageSrc: string): void {
    const validImageSrc = imageSrc || this.defaultBackground;
    this.selectedBgSubject.next(validImageSrc);
  }

  convertBufferToBase64(buffer: { type: string, data: number[] }): string {
    const byteArray = new Uint8Array(buffer.data);
    const binaryString = Array.from(byteArray).map(byte => String.fromCharCode(byte)).join('');
    return 'data:' + buffer.type + ';base64,' + btoa(binaryString);
  }

  convertBase64ToBlob(base64: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  }
}
