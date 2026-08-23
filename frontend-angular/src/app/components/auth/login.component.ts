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
          <h2>Smart Display Admin</h2>
          <p class="subtitle">Sign in to manage your displays and layouts</p>
        </div>

        <div *ngIf="errorMessage" class="error-alert">
          {{ errorMessage }}
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
              placeholder="admin@smartdisplay.local"
              class="input-control" 
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
            />
          </div>

          <button type="submit" [disabled]="loading" class="btn btn-primary">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="login-footer">
          <p>Initial default credentials:</p>
          <code>admin&#64;smartdisplay.local / REMOVED-DEFAULT-PASSWORD</code>
        </div>
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
      background: radial-gradient(circle at top, #1e293b, #0b0f19);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f1f5f9;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 36px 32px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(16px);
      box-sizing: border-box;
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon svg {
      width: 28px;
      height: 28px;
    }
    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0;
      color: #ffffff;
    }
    .subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 6px;
    }
    .error-alert {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 20px;
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
      gap: 6px;
    }
    label {
      font-size: 0.8rem;
      font-weight: 500;
      color: #cbd5e1;
    }
    .input-control {
      background: #0f172a;
      border: 1px solid #334155;
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }
    .input-control:focus {
      outline: none;
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }
    .btn {
      padding: 12px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #0284c7;
      color: #fff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .login-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
    code {
      display: inline-block;
      margin-top: 4px;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      color: #94a3b8;
      font-family: monospace;
    }
  `]
})
export class LoginComponent implements OnInit {
  email: string = 'admin@smartdisplay.local';
  password: string = 'REMOVED-DEFAULT-PASSWORD';
  loading: boolean = false;
  errorMessage: string = '';
  private returnUrl: string = '/admin/editor/living-room-display';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/editor/living-room-display';
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

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
