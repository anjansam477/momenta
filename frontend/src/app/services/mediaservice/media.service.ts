import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { MediaUploadResponse } from '../../shared/models';
import { retryWithBackoff } from '../../utils/http-retry.util';

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

    return this.http.post<MediaUploadResponse>(`${this.mediaServiceBaseUrl}/media`, formData);
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
    }).pipe(retryWithBackoff());
  }

  /** Responsive WebP widths — must match the backend's VARIANT_WIDTHS. */
  static readonly RESPONSIVE_WIDTHS = [480, 960, 1440];

  /** Direct (non-blob) URL to a stored media file. */
  fileUrl(mediaUrl: string): string {
    return `${this.mediaServiceBaseUrl}/retrieve-file?mediaUrl=${encodeURIComponent(mediaUrl)}`;
  }

  /**
   * `srcset` of WebP variants for a stored image. Each `?w=` is served the
   * matching WebP variant if present, else the original — so candidates never 404.
   */
  responsiveSrcset(mediaUrl: string): string {
    const base = this.fileUrl(mediaUrl);
    return MediaService.RESPONSIVE_WIDTHS.map((w) => `${base}&w=${w} ${w}w`).join(', ');
  }
}
