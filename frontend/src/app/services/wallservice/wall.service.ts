import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { SharedDataService } from '../sharedDataService/shared-data.service';
import { Wall, WallAnalyticsDay, WallAnalyticsTotals } from '../../shared/models';
import { SAVE_TYPE } from '../../constants/wall.constants';

export { WallAnalyticsDay, WallAnalyticsTotals };

@Injectable({
  providedIn: 'root',
})
export class WallService {
  constructor(
    private http: HttpClient,
    private sharedDataService: SharedDataService
  ) { }

  private wallServiceBaseUrl: String = SERVICE_BASE_URL + '/api/walls';

  getAllWalls(userEmail: string, page: number, pageSize?: number): Observable<Wall[]> {
    let params = new HttpParams()
    .set('emailId', userEmail)
    .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, { params });
  }

  getRecentWalls(userEmail: string): Observable<Wall[]> {
   return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/recents/${userEmail}`);
  }

  generateInviteLink(wallId: string, email: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.wallServiceBaseUrl}/${wallId}/invite-link`, { email });
  }

  getStarredWalls(userEmail: string): Observable<Wall[]> {
    const query = {
      params: { savedEmailId: userEmail, saveType: SAVE_TYPE.FAVOURITE },
    };

    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, query);
  }

  getSavedWalls(userEmail: string, page: number, saveType?: string): Observable<Wall[]> {
    let params = new HttpParams()
    .set('savedEmailId', userEmail)
    .set('page', page.toString());

    if (saveType) {
      params = params.set('saveType', saveType.toString());
    }
    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, { params });
  }

  getSharedWalls(userEmail: string, page: number): Observable<Wall[]> {
    let params = new HttpParams()
    .set('accessEmailId', userEmail)
    .set('page', page.toString());

    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, { params });
  }

  getReceivedWalls(userEmail: string, page: number, pageSize?: number): Observable<Wall[]> {
    let params = new HttpParams()
    .set('recipientEmailId', userEmail)
    .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, { params });
  }

  getArchivedWalls(userEmail: string, page: number, pageSize?: number): Observable<Wall[]> {
    let params = new HttpParams()
      .set('archivedEmail', userEmail)
      .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get<Wall[]>(`${this.wallServiceBaseUrl}/`, { params });
  }

  createWall(wallData: Partial<Wall>): Observable<Wall> {
    return this.http.post<Wall>(`${this.wallServiceBaseUrl}/`, wallData);
  }

  getWallById(wallId: string): Observable<Wall | { wallDetails: Wall }> {
    return this.http.get<Wall | { wallDetails: Wall }>(`${this.wallServiceBaseUrl}/${wallId}`);
  }

  updateWall(wallId: string, updatedData: Partial<Wall>): Observable<Wall> {
    return this.http.put<Wall>(`${this.wallServiceBaseUrl}/${wallId}`, updatedData).pipe(
      tap({
        next: () => {
          this.sharedDataService.updateWallDetailsPartially(updatedData);
        },
      })
    );
  }

  ArchiveWall(wallId: string): Observable<void> {
    return this.http.delete<void>(`${this.wallServiceBaseUrl}/${wallId}`);
  }

  saveWall(wallId: string, emailId: string, saveType: string): Observable<void> {
    const params = new HttpParams().set('saveType', saveType);
    return this.http.post<void>(`${this.wallServiceBaseUrl}/save/${wallId}/${emailId}`, {}, { params });
  }

  removeWall(wallId: string, emailId: string, saveType: string): Observable<void> {
    const params = new HttpParams().set('saveType', saveType);
    return this.http.delete<void>(`${this.wallServiceBaseUrl}/save/${wallId}/${emailId}`, { params });
  }

  acceptInvite(wallId: string, token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.wallServiceBaseUrl}/${wallId}/accept-invite`, { token });
  }

  getWallAnalytics(wallId: string, filter: { days?: number; from?: string; to?: string } = {}): Observable<{ daily: WallAnalyticsDay[]; totals: WallAnalyticsTotals; previousTotals: WallAnalyticsTotals }> {
    const params = new URLSearchParams();
    if (filter.from) { params.set('from', filter.from); params.set('to', filter.to ?? ''); }
    else params.set('days', String(filter.days ?? 30));
    return this.http.get<{ daily: WallAnalyticsDay[]; totals: WallAnalyticsTotals; previousTotals: WallAnalyticsTotals }>(`${this.wallServiceBaseUrl}/${wallId}/analytics?${params}`);
  }
}
