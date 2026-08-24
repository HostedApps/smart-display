import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { EmergencyBroadcast } from '../models/display.model';

@Injectable({
  providedIn: 'root'
})
export class EmergencyService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken() || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Kiosk checks for active broadcast (Public via token)
  checkActiveBroadcast(displayToken: string): Observable<{ active: boolean; broadcast?: EmergencyBroadcast }> {
    return this.http.get<{ active: boolean; broadcast?: EmergencyBroadcast }>(
      `${environment.apiUrl}/emergency.php?token=${displayToken}`
    );
  }

  // 2. Admin triggers emergency broadcast
  triggerBroadcast(payload: { title: string; message: string; severity: 'info' | 'warning' | 'critical'; play_sound: boolean; display_id?: number | null }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/emergency.php`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // 3. Admin dismisses broadcast
  dismissBroadcast(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/emergency.php?action=dismiss`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}
