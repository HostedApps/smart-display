import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WallDropItem } from '../models/display.model';

@Injectable({
  providedIn: 'root'
})
export class WalldropService {
  constructor(private http: HttpClient) {}

  getDrops(token: string): Observable<{ success: boolean; display: any; items: WallDropItem[] }> {
    return this.http.get<{ success: boolean; display: any; items: WallDropItem[] }>(
      `${environment.apiUrl}/walldrop.php?token=${token}`
    );
  }

  beamDrop(token: string, payload: { type: 'note' | 'photo' | 'alert'; author: string; content: string; media_url?: string; color?: string }): Observable<{ success: boolean; message: string; item_id: number }> {
    return this.http.post<{ success: boolean; message: string; item_id: number }>(
      `${environment.apiUrl}/walldrop.php?token=${token}`,
      payload
    );
  }
}
