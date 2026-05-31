import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';

@Injectable({
  providedIn: 'root',
})
export class MediaService {

  /**
   * Base Url to handle all media-service requests.
   */
  private mediaServiceBaseUrl = SERVICE_BASE_URL + '/api/uploads';

  constructor(private http: HttpClient) { }

  /**
   * Uploads media files in a respective wall
   * @param wallId 
   * @param postId 
   * @param fileType 
   * @param file 
   * @returns 
   */
  uploadFile(wallId: string, postId: string, fileType: string, file: File) {
    const formData = new FormData();
    formData.append('wallId', wallId);
    formData.append('postId', postId);
    formData.append('fileType', fileType);
    formData.append('file', file);

    return this.http.post<any>(`${this.mediaServiceBaseUrl}/media`, formData);
  }

  /**
   * Retreieve files from the mediaUrl
   * @param mediaUrl 
   * @returns 
   */
  retrieveFile(mediaUrl: string): Observable<Blob> {
    return this.http.get<Blob>(`${this.mediaServiceBaseUrl}/retrieve-file`, {
      params: { mediaUrl },
      responseType: 'blob' as 'json'
    });
  }
}
