import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  constructor(private http: HttpClient) { }

  /**
   * Base Url to handle all mail-service requests.
  */
  private mailServiceBaseUrl = SERVICE_BASE_URL + '/api/mail';

  /**
   * Schedules a mail
   * @param scheduledData 
   * @returns 
   */
  scheduleMail(scheduledData: any): Observable<any> {
    return this.http.post(`${this.mailServiceBaseUrl}/send-mail`, scheduledData);
  }

  /**
   * Fetches scheduled email data by wall ID
   * @param wallId ID of the wall
   * @returns An observable with the scheduled email data
   */
  getScheduleEmailsByWallId(wallId: string): Observable<any> {
    return this.http.get(`${this.mailServiceBaseUrl}/scheduled/${wallId}`);
  }


  sendContactEmail(data: { email: string, name: string, message: string }): Observable<any> {
    return this.http.post<any>(`${this.mailServiceBaseUrl}/send-contact-email`, data);
  }

  removeRecipient(wallId: string, recipient: string): Observable<any> {
    return this.http.delete(`${this.mailServiceBaseUrl}/remove/${wallId}/${recipient}`);
  }

  cancelScheduledMail(wallId: string): Observable<any> {
    return this.http.delete(`${this.mailServiceBaseUrl}/cancel/${wallId}`);
  }
}
