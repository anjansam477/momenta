import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SERVICE_BASE_URL } from '../../environment-config';
import { catchError, Observable, of } from 'rxjs';
import { GiphyGif } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class GifsService {
  private base = `${SERVICE_BASE_URL}/api/giphy`;

  constructor(private http: HttpClient) {}

  /* ── Trending ── */
  trendingGifs(): Observable<GiphyGif[]> {
    return this.http.get<GiphyGif[]>(`${this.base}/gifs/trending`).pipe(
      catchError(() => of([]))
    );
  }

  trendingStickers(): Observable<GiphyGif[]> {
    return this.http.get<GiphyGif[]>(`${this.base}/stickers/trending`).pipe(
      catchError(() => of([]))
    );
  }

  /* ── Search (offset for load-more) ── */
  searchGifs(query: string, offset = 0): Observable<GiphyGif[]> {
    return this.http.get<GiphyGif[]>(`${this.base}/gifs/search?q=${encodeURIComponent(query)}&offset=${offset}`);
  }

  searchStickers(query: string, offset = 0): Observable<GiphyGif[]> {
    return this.http.get<GiphyGif[]>(`${this.base}/stickers/search?q=${encodeURIComponent(query)}&offset=${offset}`);
  }

  /* ── Discovery ── */
  trendingSearchTerms(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/trending/searches`).pipe(
      catchError(() => of([]))
    );
  }

  autocompleteTags(query: string): Observable<{ name: string }[]> {
    return this.http.get<{ name: string }[]>(`${this.base}/gifs/autocomplete?q=${encodeURIComponent(query)}`).pipe(
      catchError(() => of([]))
    );
  }

  relatedTags(term: string): Observable<{ name: string }[]> {
    return this.http.get<{ name: string }[]>(`${this.base}/tags/related/${encodeURIComponent(term)}`).pipe(
      catchError(() => of([]))
    );
  }

  /* ── Analytics — call when user selects/sends a GIF (Giphy ToS) ── */
  trackAction(analyticsPayload: string, action: 'click' | 'send' = 'click'): void {
    if (!analyticsPayload) return;
    this.http.post(`${this.base}/analytics/action`, {
      analytics_response_payload: analyticsPayload,
      action
    }).pipe(catchError(() => of(null))).subscribe();
  }
}
