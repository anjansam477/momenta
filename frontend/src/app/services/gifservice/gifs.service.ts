import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SERVICE_BASE_URL } from '../../environment-config';
import { catchError, Observable, of, tap } from 'rxjs';
import { GiphyGif } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class GifsService {

  private GiphyUrl = SERVICE_BASE_URL + `/api/giphy`;
  private cachedTrendingGifs: GiphyGif[] | null = null;
  private cacheGifsTimestamp: number = 0;
  private cachedTrendingStickers: GiphyGif[] | null = null;
  private cachedStickersTimestamp: number = 0;
  private cacheDuration: number = 1000 * 60 * 30;

  constructor(private http: HttpClient) { }

  trendingGifs(): Observable<GiphyGif[]> {
    const now = Date.now();
    if (this.cachedTrendingGifs && (now - this.cacheGifsTimestamp) < this.cacheDuration) {
      return of(this.cachedTrendingGifs);
    }

    const url = `${this.GiphyUrl}/gifs/trending`;
    return this.http.get<GiphyGif[]>(url).pipe(
      tap(data => {
        this.cachedTrendingGifs = data;
        this.cacheGifsTimestamp = now;
      }),
      catchError(error => {
        console.error('Error fetching trending GIFs', error);
        return of([]);
      })
    );
  }

  searchGifs(query: string): Observable<GiphyGif[]> {
    const url = `${this.GiphyUrl}/gifs/search?q=${query}`;
    return this.http.get<GiphyGif[]>(url);
  }

  trendingStickers(): Observable<GiphyGif[]> {
    const now = Date.now();
    if (this.cachedTrendingStickers && (now - this.cachedStickersTimestamp) < this.cacheDuration) {
      return of(this.cachedTrendingStickers);
    }

    const url = `${this.GiphyUrl}/stickers/trending`;
    return this.http.get<GiphyGif[]>(url).pipe(
      tap(data => {
        this.cachedTrendingStickers = data;
        this.cachedStickersTimestamp = now;
      }),
      catchError(error => {
        console.error('Error fetching trending Stickers', error);
        return of([]);
      })
    );
  }

  searchStickers(query: string): Observable<GiphyGif[]> {
    const url = `${this.GiphyUrl}/stickers/search?q=${query}`;
    return this.http.get<GiphyGif[]>(url);
  }
}
