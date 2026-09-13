import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h2>Smart Display</h2>
          <p class="subtitle">Sign in to manage your displays and layouts</p>
        </div>

        <div *ngIf="errorMessage" class="error-alert">
          {{ errorMessage }}
        </div>

        <div *ngIf="successMessage" class="success-alert">
          {{ successMessage }}
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              required 
              placeholder="you@domain.com"
              class="input-control" 
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password"
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              required 
              placeholder="••••••••"
              class="input-control" 
              autocomplete="current-password"
            />
          </div>

          <button type="submit" [disabled]="loading || !email || !password" class="btn btn-primary">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top, #0f172a 0%, #080c14 100%);
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #f1f5f9;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      box-sizing: border-box;
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 50px;
      height: 50px;
      margin: 0 auto 12px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2));
      border: 1px solid rgba(14, 165, 233, 0.4);
      color: #38bdf8;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
    }
    .logo-icon svg {
      width: 26px;
      height: 26px;
    }
    h2 {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin: 0;
      color: #ffffff;
    }
    .subtitle {
      font-size: 0.82rem;
      color: #94a3b8;
      margin-top: 6px;
      line-height: 1.4;
    }

    .error-alert {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      margin-bottom: 16px;
      text-align: center;
    }
    .success-alert {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #4ade80;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      margin-bottom: 16px;
      text-align: center;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .input-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
      transition: all 0.2s;
    }
    .input-control:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
    .btn {
      padding: 12px;
      border-radius: 8px;
      border: none;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      margin-top: 6px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 18px rgba(14, 165, 233, 0.6);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  private returnUrl: string = '/admin/displays';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/displays';
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.errorMessage = res.error || 'Invalid credentials';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Authentication server unreachable';
      }
    });
  }
}
