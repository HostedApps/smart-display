import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only attach auth and device tokens to internal backend API requests.
    // External APIs (Open-Meteo, OpenWeather, CartoDB, RainViewer, etc.) must NOT receive internal tokens,
    // which cause CORS preflight OPTIONS failures and leak credentials.
    const isInternalApi = 
      req.url.startsWith('/api') || 
      req.url.startsWith('api/') || 
      req.url.includes('/backend-api/') ||
      req.url.includes('/api/');

    if (!isInternalApi) {
      return next.handle(req);
    }

    const token = this.authService.getToken();

    let headers = req.headers;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    const deviceToken = localStorage.getItem('device_token');
    if (deviceToken) {
      headers = headers.set('X-Device-Token', deviceToken);
    }

    let authReq = req.clone({ headers });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // If 401 Unauthorized occurs on an administrative action for an authenticated admin user, log out.
        // Never log out or redirect kiosks viewing a display or pairing screen.
        const isDisplayOrPairRoute = window.location.hash.includes('/display/') || window.location.hash.includes('/pair');
        const hasAdminToken = !!this.authService.getToken();
        if (error.status === 401 && hasAdminToken && !isDisplayOrPairRoute && !req.url.includes('action=login')) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
}
