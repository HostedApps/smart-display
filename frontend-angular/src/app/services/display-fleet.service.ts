import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DisplaySummary, Device, PairingCodeResponse, PairingStatusResponse } from '../models/display.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DisplayFleetService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken() || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Get all displays owned by current user
  getDisplays(): Observable<{ success: boolean; displays: DisplaySummary[] }> {
    return this.http.get<{ success: boolean; displays: DisplaySummary[] }>(
      `${environment.apiUrl}/displays.php`,
      { headers: this.getAuthHeaders() }
    );
  }

  // 2. Create a new display
  createDisplay(name: string, orientation: string, theme: string = 'dark'): Observable<{ success: boolean; display: any }> {
    return this.http.post<{ success: boolean; display: any }>(
      `${environment.apiUrl}/displays.php`,
      { name, orientation, theme },
      { headers: this.getAuthHeaders() }
    );
  }

  // 3. Delete a display
  deleteDisplay(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${environment.apiUrl}/displays.php?id=${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // 4. Pair device using 6-digit PIN
  pairDevice(pairingCode: string, displayId: number, deviceName: string): Observable<{ success: boolean; message: string; display_name: string; display_token: string }> {
    return this.http.post<{ success: boolean; message: string; display_name: string; display_token: string }>(
      `${environment.apiUrl}/pairing.php?action=pair_device`,
      { pairing_code: pairingCode, display_id: displayId, device_name: deviceName },
      { headers: this.getAuthHeaders() }
    );
  }

  // 5. List bonded devices for display
  listDevices(displayId?: number): Observable<{ success: boolean; devices: Device[] }> {
    const query = displayId ? `?action=list_devices&display_id=${displayId}` : '?action=list_devices';
    return this.http.get<{ success: boolean; devices: Device[] }>(
      `${environment.apiUrl}/pairing.php${query}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // 6. Revoke a bonded device
  revokeDevice(deviceId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/pairing.php?action=revoke_device`,
      { id: deviceId },
      { headers: this.getAuthHeaders() }
    );
  }

  // 7. Generate 6-digit pairing code (called by unpaired TV/iPad)
  generatePairingCode(): Observable<PairingCodeResponse> {
    return this.http.get<PairingCodeResponse>(`${environment.apiUrl}/pairing.php?action=generate_code`);
  }

  // 8. Check pairing status (polled by unpaired TV/iPad)
  checkPairingStatus(deviceSecret: string): Observable<PairingStatusResponse> {
    return this.http.get<PairingStatusResponse>(`${environment.apiUrl}/pairing.php?action=check_status&device_secret=${deviceSecret}`);
  }
}
