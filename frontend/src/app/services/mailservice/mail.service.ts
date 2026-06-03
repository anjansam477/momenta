import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';

export interface ScheduleMailPayload {
  primary: string[];
  wallId: string;
  scheduledDate: Date;
  cc: string[];
  userEmail: string | null;
  type: string;
}

export interface ScheduledMailData {
  recipients?: { primary: string[]; cc?: string[] };
  emailId?: { primary: string[]; cc?: string[] };
  scheduledAt?: string;
  scheduledDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MailService {

  constructor(private http: HttpClient) { }

  private mailServiceBaseUrl = SERVICE_BASE_URL + '/api/mail';

  scheduleMail(scheduledData: ScheduleMailPayload): Observable<void> {
    return this.http.post<void>(`${this.mailServiceBaseUrl}/send-mail`, scheduledData);
  }

  getScheduleEmailsByWallId(wallId: string): Observable<ScheduledMailData> {
    return this.http.get<ScheduledMailData>(`${this.mailServiceBaseUrl}/scheduled/${wallId}`);
  }

  sendContactEmail(data: { email: string; name: string; message: string }): Observable<void> {
    return this.http.post<void>(`${this.mailServiceBaseUrl}/send-contact-email`, data);
  }

  removeRecipient(wallId: string, recipient: string): Observable<void> {
    return this.http.delete<void>(`${this.mailServiceBaseUrl}/remove/${wallId}/${recipient}`);
  }

  cancelScheduledMail(wallId: string): Observable<void> {
    return this.http.delete<void>(`${this.mailServiceBaseUrl}/cancel/${wallId}`);
  }
}
