import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SuperAdminStats, User, UserActivityLog } from '../models/display.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken() || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getStats(): Observable<{ success: boolean; stats: SuperAdminStats }> {
    return this.http.get<{ success: boolean; stats: SuperAdminStats }>(
      `${environment.apiUrl}/superadmin.php?action=stats`,
      { headers: this.getHeaders() }
    );
  }

  getUsers(): Observable<{ success: boolean; users: User[]; count: number; maxCapacity: number }> {
    return this.http.get<{ success: boolean; users: User[]; count: number; maxCapacity: number }>(
      `${environment.apiUrl}/superadmin.php?action=users`,
      { headers: this.getHeaders() }
    );
  }

  toggleUserStatus(userId: number, isActive: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/superadmin.php?action=toggle_user_status`,
      { userId, isActive },
      { headers: this.getHeaders() }
    );
  }

  updateUserRole(userId: number, role: 'user' | 'admin' | 'superadmin'): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/superadmin.php?action=update_role`,
      { userId, role },
      { headers: this.getHeaders() }
    );
  }

  deleteUser(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/superadmin.php?action=delete_user`,
      { userId },
      { headers: this.getHeaders() }
    );
  }

  getActivities(limit: number = 60): Observable<{ success: boolean; activities: UserActivityLog[]; count: number }> {
    return this.http.get<{ success: boolean; activities: UserActivityLog[]; count: number }>(
      `${environment.apiUrl}/superadmin.php?action=activities&limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  getUserDisplays(userId: number): Observable<{ success: boolean; userId: number; displays: any[] }> {
    return this.http.get<{ success: boolean; userId: number; displays: any[] }>(
      `${environment.apiUrl}/superadmin.php?action=user_displays&user_id=${userId}`,
      { headers: this.getHeaders() }
    );
  }
}
