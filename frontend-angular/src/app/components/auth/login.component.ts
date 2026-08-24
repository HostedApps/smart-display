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
      background: radial-gradient(circle at top, #0f172a 0%, #080c14 100%);
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #f1f5f9;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 40px 36px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      box-sizing: border-box;
    }
    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 14px;
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
      width: 28px;
      height: 28px;
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
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 6px;
    }
    .error-alert {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 20px;
      text-align: center;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .input-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .input-control:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
    .btn {
      padding: 13px;
      border-radius: 10px;
      border: none;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      margin-top: 8px;
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
    .login-footer {
      margin-top: 26px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
    code {
      display: inline-block;
      margin-top: 6px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 3px 8px;
      border-radius: 6px;
      color: #38bdf8;
      font-family: monospace;
      font-size: 0.75rem;
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
