import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { SharedDataService } from '../sharedDataService/shared-data.service';
import { AuthService } from '../authservice/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WallService {
  constructor(
    private http: HttpClient,
    private sharedDataService:SharedDataService, 
    private authService: AuthService
  ) { }

  /**
   * Base Url to handle all wall-service requests.
  */
  private wallServiceBaseUrl: String = SERVICE_BASE_URL + '/api/walls';

  /**
   * Returns all walls related to a particular emailid
   * @param userEmail
   * @returns 
   */
  getAllWalls(userEmail: any, page: number, pageSize?: number): Observable<any> {
    let params = new HttpParams()
    .set('emailId', userEmail)
    .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get(`${this.wallServiceBaseUrl}/`, { params });
  }

  getRecentWalls(userEmail: any): Observable<any> {
   return this.http.get(`${this.wallServiceBaseUrl}/recents/${userEmail}`);
  }

  /**
   * Returns all starred walls related to a particular emailId
   * @param userEmail 
   * @returns 
   */
  getStarredWalls(userEmail: any): Observable<any> {
    const query = {
      params: { savedEmailId: userEmail, saveType: 'favourite' },
    };

    return this.http.get(`${this.wallServiceBaseUrl}/`, query);
  }

  // getSavedWalls(userEmail: any): Observable<any> {
  //   const query = {
  //     params: { savedEmailId: userEmail, saveType: 'saved' },
  //   };

  //   return this.http.get(`${this.wallServiceBaseUrl}/`, query);
  // }

  getSavedWalls(userEmail: string, page: number, saveType?: string): Observable<any> {    
    let params = new HttpParams()
    .set('savedEmailId', userEmail)
    .set('page', page.toString());
    
    if (saveType) {
      params = params.set('saveType', saveType.toString());
    }
    return this.http.get(`${this.wallServiceBaseUrl}/`, { params });
  }

  getSharedWalls(userEmail: any, page: number): Observable<any> {
    let params = new HttpParams()
    .set('accessEmailId', userEmail)
    .set('page', page.toString());

    return this.http.get(`${this.wallServiceBaseUrl}/`, { params });
  }

  getReceivedWalls(userEmail: any, page: number, pageSize?: number): Observable<any> {
    let params = new HttpParams()
    .set('recipientEmailId', userEmail)
    .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get(`${this.wallServiceBaseUrl}/`, { params });
  }

  /**
   * Returns all archived walls related to aprticular emailId
   * @param userEmail 
   * @returns 
   */
  getArchivedWalls(userEmail: any, page: number, pageSize?: number): Observable<any> {
    let params = new HttpParams()
      .set('archivedEmail', userEmail)
      .set('page', page.toString());

    if (pageSize) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get(`${this.wallServiceBaseUrl}/`, { params });
  }

  /**
   * Creates a new wall
   * @param wallData 
   * @returns 
   */
  createWall(wallData: any): Observable<any> {
    return this.http.post(`${this.wallServiceBaseUrl}/`, wallData);
  }

  /**
   * Returns details of a specific wall
   * @param wallId 
   * @returns 
   */
  getWallById(wallId: string): Observable<any> {
    return this.http.get(`${this.wallServiceBaseUrl}/${wallId}`);
  }

  /**
   * Update wall informations according to the wallId
   * @param wallId 
   * @param updatedData 
   * @returns 
   */
  updateWall(wallId: string, updatedData: any): Observable<any> {
    // this.sharedDataService.updateWallDetailsPartially(updatedData);
    return this.http.put(`${this.wallServiceBaseUrl}/${wallId}`, updatedData).pipe(
      tap({
        next: () => {
          this.sharedDataService.updateWallDetailsPartially(updatedData);
        },
      })
    );
  }

  ArchiveWall(wallId: string): Observable<any> {
    return this.http.delete(`${this.wallServiceBaseUrl}/${wallId}`);
  }

  saveWall(wallId: string, emailId: string, saveType: string): Observable<any> {
    const params = new HttpParams().set('saveType', saveType);
    return this.http.post(`${this.wallServiceBaseUrl}/save/${wallId}/${emailId}`, {}, { params });
  }  

  removeWall(wallId: string, emailId: string, saveType: string): Observable<any> {
    const params = new HttpParams().set('saveType', saveType);
    return this.http.delete(`${this.wallServiceBaseUrl}/save/${wallId}/${emailId}`, { params });
  }  
}
