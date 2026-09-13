import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, User, CaptchaChallenge, CapacityStatus } from '../models/display.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'smart_display_auth_token';
  private readonly USER_KEY = 'smart_display_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  getCaptchaChallenge(): Observable<CaptchaChallenge> {
    return this.http.get<CaptchaChallenge>(`${environment.apiUrl}/captcha.php?t=${Date.now()}`);
  }

  getCapacityStatus(): Observable<CapacityStatus> {
    return this.http.get<CapacityStatus>(`${environment.apiUrl}/auth.php?action=capacity`);
  }

  getPublicConfig(): Observable<CapacityStatus> {
    return this.http.get<CapacityStatus>(`${environment.apiUrl}/auth.php?action=public_config`);
  }

  login(email: string, password: string, recaptchaToken?: string, captchaToken?: string, captchaAnswer?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth.php?action=login`, { 
      email, 
      password, 
      recaptchaToken,
      captchaToken, 
      captchaAnswer 
    }).pipe(
      tap(res => {
        if (res && res.success && res.token && res.user) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  register(name: string, email: string, password: string, recaptchaToken?: string, captchaToken?: string, captchaAnswer?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth.php?action=register`, { 
      name, 
      email, 
      password, 
      recaptchaToken,
      captchaToken, 
      captchaAnswer 
    });
  }

  verifyEmail(email: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth.php?action=verify_email`, { email, code })
      .pipe(
        tap(res => {
          if (res && res.success && res.token && res.user) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this.currentUserSubject.next(res.user);
          }
        })
      );
  }

  resendVerification(email: string): Observable<{ success: boolean; message: string; devVerificationCode?: string; devVerificationLink?: string }> {
    return this.http.post<{ success: boolean; message: string; devVerificationCode?: string; devVerificationLink?: string }>(
      `${environment.apiUrl}/auth.php?action=resend_verification`, 
      { email }
    );
  }

  googleAuth(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth.php?action=google_auth`, { credential })
      .pipe(
        tap(res => {
          if (res && res.success && res.token && res.user) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this.currentUserSubject.next(res.user);
          }
        })
      );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth.php?action=logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        error: () => {}
      });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/admin/login']);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isSuperAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'superadmin';
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
