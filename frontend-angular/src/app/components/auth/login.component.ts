import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CaptchaChallenge, CapacityStatus } from '../../models/display.model';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <!-- Logo & Header -->
        <div class="login-header">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h2>Smart Display</h2>
          <p class="subtitle">
            {{ isVerifyingEmail ? 'Confirm your email address' : (mode === 'login' ? 'Sign in to manage your displays & layouts' : 'Create an account to join the fleet') }}
          </p>
        </div>

        <!-- Mode Switcher Tabs (Login vs Register) -->
        <div *ngIf="!isVerifyingEmail" class="mode-switcher">
          <button type="button" [class.active]="mode === 'login'" (click)="setMode('login')">
            Sign In
          </button>
          <button type="button" [class.active]="mode === 'register'" (click)="setMode('register')" [disabled]="capacity?.isFull">
            Register {{ capacity ? '(' + capacity.availableSlots + ' left)' : '' }}
          </button>
        </div>

        <!-- Capacity Warning if Full -->
        <div *ngIf="mode === 'register' && capacity?.isFull" class="capacity-alert">
          🚫 System capacity of 50 users is fully reached. Registration is closed.
        </div>

        <!-- Error & Success Messages -->
        <div *ngIf="errorMessage" class="error-alert">
          {{ errorMessage }}
        </div>
        <div *ngIf="successMessage" class="success-alert">
          {{ successMessage }}
        </div>

        <!-- STATE 1: EMAIL VERIFICATION VIEW -->
        <div *ngIf="isVerifyingEmail" class="verify-view">
          <div class="verify-instructions">
            Enter the 6-digit verification code sent to:
            <div class="verify-email-highlight">{{ verifyEmailAddress }}</div>
          </div>

          <!-- Dev Code Preview Helper (if available from API) -->
          <div *ngIf="devVerificationCode" class="dev-otp-box">
            <span>Development Code:</span>
            <strong>{{ devVerificationCode }}</strong>
          </div>

          <form (ngSubmit)="onVerifyCodeSubmit()" class="login-form">
            <div class="form-group">
              <label for="verificationCode">6-Digit Verification Code</label>
              <input 
                id="verificationCode"
                type="text" 
                [(ngModel)]="verificationCode" 
                name="verificationCode" 
                required 
                maxlength="6"
                placeholder="123456"
                class="input-control input-otp" 
                autocomplete="one-time-code"
              />
            </div>

            <button type="submit" [disabled]="loading || verificationCode.length < 4" class="btn btn-primary">
              {{ loading ? 'Verifying...' : 'Confirm & Sign In' }}
            </button>

            <div class="verify-footer-actions">
              <button type="button" (click)="resendCode()" [disabled]="resending || resendCountdown > 0" class="btn-link">
                {{ resendCountdown > 0 ? 'Resend code in ' + resendCountdown + 's' : (resending ? 'Sending...' : 'Resend Code') }}
              </button>
              <button type="button" (click)="cancelVerification()" class="btn-link btn-link-cancel">
                ← Back to Login
              </button>
            </div>
          </form>
        </div>

        <!-- STATE 2: STANDARD LOGIN / REGISTER FORM -->
        <div *ngIf="!isVerifyingEmail">
          <!-- Google Identity Services (GIS) / Google Sign-In -->
          <div class="google-auth-section">
            <div id="googleBtnContainer" class="google-gis-btn-box" [style.display]="googleClientId ? 'flex' : 'none'"></div>

            <div *ngIf="!googleClientId" class="google-placeholder-box">
              <button type="button" (click)="onGooglePlaceholderClick()" class="btn-google">
                <svg viewBox="0 0 24 24" class="google-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{{ mode === 'login' ? 'Sign in with Google' : 'Register with Google' }}</span>
              </button>

              <div *ngIf="showGoogleConfigHelp" class="google-config-alert">
                💡 <strong>Google Auth Ready</strong>: Google Identity Services is integrated! Set <code>GOOGLE_CLIENT_ID</code> in <code>.env</code> on the server to enable official 1-click Google Sign-In.
              </div>
            </div>

            <div class="divider-or">
              <span>or continue with email</span>
            </div>
          </div>

          <form (ngSubmit)="onSubmit()" class="login-form">
            <!-- Name (Register Only) -->
            <div *ngIf="mode === 'register'" class="form-group">
              <label for="name">Your Name</label>
              <input 
                id="name"
                type="text" 
                [(ngModel)]="name" 
                name="name" 
                required 
                placeholder="e.g. Sarah Connor"
                class="input-control" 
              />
            </div>

            <!-- Email -->
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

            <!-- Password -->
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

            <!-- Official Google reCAPTCHA Container -->
            <div class="recaptcha-wrapper">
              <div id="recaptchaContainer" class="recaptcha-box-container"></div>
            </div>

            <button type="submit" [disabled]="loading || !email || !password || !recaptchaToken" class="btn btn-primary">
              {{ loading ? (mode === 'login' ? 'Signing in...' : 'Registering...') : (mode === 'login' ? 'Sign In' : 'Create Account') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      width: 100vw;
      min-height: 100vh;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top, #0f172a 0%, #080c14 100%);
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #f1f5f9;
      box-sizing: border-box;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      box-sizing: border-box;
    }
    .login-header {
      text-align: center;
      margin-bottom: 20px;
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

    .mode-switcher {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 3px;
      margin-bottom: 18px;
    }
    .mode-switcher button {
      flex: 1;
      padding: 8px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-switcher button.active {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.4);
    }
    .mode-switcher button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .capacity-alert {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      margin-bottom: 14px;
      text-align: center;
    }

    .google-auth-section {
      margin-bottom: 16px;
    }
    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-google:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .google-icon {
      width: 18px;
      height: 18px;
    }
    .divider-or {
      text-align: center;
      position: relative;
      margin: 16px 0 12px;
    }
    .divider-or::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
    }
    .divider-or span {
      position: relative;
      background: #131c2e;
      padding: 0 10px;
      font-size: 0.72rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      gap: 14px;
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

    /* Captcha Widget */
    .captcha-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .captcha-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-refresh-captcha {
      background: none;
      border: none;
      color: #38bdf8;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .captcha-challenge-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .captcha-question-badge {
      flex: 1;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.15));
      border: 1px dashed rgba(14, 165, 233, 0.4);
      color: #38bdf8;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.95rem;
      text-align: center;
      letter-spacing: 1px;
    }
    .input-captcha {
      width: 90px;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
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

    /* Verify View */
    .verify-instructions {
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 14px;
    }
    .verify-email-highlight {
      font-weight: 700;
      color: #38bdf8;
      margin-top: 4px;
    }
    .dev-otp-box {
      background: rgba(234, 179, 8, 0.15);
      border: 1px dashed rgba(234, 179, 8, 0.5);
      color: #fef08a;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .input-otp {
      font-size: 1.4rem;
      text-align: center;
      letter-spacing: 6px;
      font-weight: 800;
    }
    .verify-footer-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
    }
    .btn-link {
      background: none;
      border: none;
      color: #38bdf8;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-link:hover {
      text-decoration: underline;
    }
    .btn-link-cancel {
      color: #94a3b8;
    }
    .recaptcha-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 14px 0 16px;
      min-height: 78px;
    }
    .recaptcha-box-container {
      display: flex;
      justify-content: center;
      width: 100%;
    }
    .google-gis-btn-box {
      display: flex;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      margin-bottom: 12px;
    }
    .google-placeholder-box {
      width: 100%;
    }
    .google-config-alert {
      margin-top: 8px;
      padding: 10px 14px;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.3);
      border-radius: 10px;
      font-size: 0.78rem;
      color: #bae6fd;
      line-height: 1.4;
      text-align: left;
    }
    .google-config-alert code {
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 6px;
      border-radius: 4px;
      color: #38bdf8;
      font-weight: 600;
    }
  `]
})
export class LoginComponent implements OnInit, AfterViewInit {
  mode: 'login' | 'register' = 'login';
  name: string = '';
  email: string = '';
  password: string = '';

  // Google reCAPTCHA & GIS Keys
  recaptchaSiteKey: string = '6Lf-yrgtAAAAAGsEyEOe0lrAU6pde04hOnQVe_yO';
  googleClientId: string = '';
  recaptchaToken: string = '';
  recaptchaWidgetId?: number;
  recaptchaLoaded: boolean = false;
  gisInitialized: boolean = false;



  // Google Config Helper
  showGoogleConfigHelp: boolean = false;

  // Capacity status
  capacity: CapacityStatus | null = null;

  // Email verification state
  isVerifyingEmail: boolean = false;
  verifyEmailAddress: string = '';
  verificationCode: string = '';
  devVerificationCode: string = '';
  resendCountdown: number = 0;
  resending: boolean = false;

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

    // Check if URL contains direct email verification parameters (e.g. from email link)
    const urlEmail = this.route.snapshot.queryParams['verifyEmail'];
    const urlCode = this.route.snapshot.queryParams['code'];
    if (urlEmail && urlCode) {
      this.isVerifyingEmail = true;
      this.verifyEmailAddress = urlEmail;
      this.verificationCode = urlCode;
      this.onVerifyCodeSubmit();
      return;
    }

    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }

    this.loadPublicConfig();
  }

  ngAfterViewInit(): void {
    if (!this.isVerifyingEmail) {
      this.initGoogleRecaptcha();
      if (this.googleClientId) {
        this.initGoogleAuth();
      }
    }
  }

  loadPublicConfig(): void {
    this.authService.getPublicConfig().subscribe({
      next: (res) => {
        if (res.success) {
          this.capacity = res;
          const oldKey = this.recaptchaSiteKey;
          if (res.recaptchaSiteKey) {
            this.recaptchaSiteKey = res.recaptchaSiteKey;
          }
          if (res.googleClientId) {
            this.googleClientId = res.googleClientId;
            this.initGoogleAuth();
          }
          if (res.recaptchaSiteKey && res.recaptchaSiteKey !== oldKey) {
            const container = document.getElementById('recaptchaContainer');
            if (container) container.innerHTML = '';
            this.recaptchaWidgetId = undefined;
          }
          this.initGoogleRecaptcha();
        }
      },
      error: () => {
        this.initGoogleRecaptcha();
      }
    });
  }

  initGoogleRecaptcha(): void {
    const tryRender = () => {
      const grecaptcha = (window as any).grecaptcha;
      const container = document.getElementById('recaptchaContainer');
      if (!container) return;

      if (grecaptcha && grecaptcha.render) {
        try {
          if (this.recaptchaWidgetId === undefined && !container.hasChildNodes()) {
            this.recaptchaWidgetId = grecaptcha.render('recaptchaContainer', {
              sitekey: this.recaptchaSiteKey,
              theme: 'dark',
              callback: (token: string) => {
                this.recaptchaToken = token;
                this.errorMessage = '';
              },
              'expired-callback': () => {
                this.recaptchaToken = '';
              },
              'error-callback': () => {
                this.errorMessage = 'reCAPTCHA error. Please reload the page.';
              }
            });
            this.recaptchaLoaded = true;
          }
        } catch (e) {
          console.warn('Google reCAPTCHA render issue:', e);
          this.errorMessage = 'reCAPTCHA failed to load. Please reload the page.';
        }
      } else {
        setTimeout(tryRender, 250);
      }
    };
    tryRender();
  }

  initGoogleAuth(): void {
    if (!this.googleClientId) return;

    const tryInitGIS = () => {
      const google = (window as any).google;
      const btnContainer = document.getElementById('googleBtnContainer');

      if (google && google.accounts && google.accounts.id && btnContainer) {
        try {
          google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (resp: any) => this.handleGoogleCredentialResponse(resp),
            auto_select: false,
            cancel_on_tap_outside: true
          });

          btnContainer.innerHTML = '';
          google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: this.mode === 'login' ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 376
          });
          this.gisInitialized = true;
        } catch (e) {
          console.warn('GIS render button error:', e);
        }
      } else {
        setTimeout(tryInitGIS, 250);
      }
    };

    tryInitGIS();
  }

  handleGoogleCredentialResponse(response: any): void {
    if (!response || !response.credential) {
      this.errorMessage = 'Google authentication response was empty.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.googleAuth(response.credential).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.errorMessage = res.error || 'Google authentication failed';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Google authentication error';
      }
    });
  }

  onGooglePlaceholderClick(): void {
    if (this.googleClientId) {
      const google = (window as any).google;
      if (google && google.accounts && google.accounts.id) {
        google.accounts.id.prompt();
      }
    } else {
      this.showGoogleConfigHelp = !this.showGoogleConfigHelp;
    }
  }


  setMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.recaptchaToken = '';

    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha && this.recaptchaWidgetId !== undefined) {
      try {
        grecaptcha.reset(this.recaptchaWidgetId);
      } catch (e) {}
    }

    if (this.googleClientId) {
      this.initGoogleAuth();
    }
  }

  resetCaptcha(): void {
    this.recaptchaToken = '';
    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha && this.recaptchaWidgetId !== undefined) {
      try {
        grecaptcha.reset(this.recaptchaWidgetId);
      } catch (e) {}
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    if (!this.recaptchaToken) {
      this.errorMessage = 'Please complete the security verification (reCAPTCHA) below.';
      return;
    }

    this.loading = true;

    if (this.mode === 'register') {
      if (!this.name.trim()) {
        this.loading = false;
        this.errorMessage = 'Please enter your name.';
        return;
      }

      this.authService.register(
        this.name, 
        this.email, 
        this.password, 
        this.recaptchaToken
      ).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.isVerifyingEmail = true;
            this.verifyEmailAddress = this.email;
            this.devVerificationCode = res.devVerificationCode || '';
            this.successMessage = res.message || 'Verification code sent to your email.';
            this.startResendTimer();
          } else {
            this.errorMessage = res.error || 'Registration failed.';
            this.resetCaptcha();
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.error || 'Registration failed. Please try again.';
          this.resetCaptcha();
        }
      });
    } else {
      // Login
      this.authService.login(
        this.email, 
        this.password, 
        this.recaptchaToken
      ).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.errorMessage = res.error || 'Invalid credentials';
            this.resetCaptcha();
          }
        },
        error: (err) => {
          this.loading = false;
          if (err.error?.emailUnverified) {
            this.isVerifyingEmail = true;
            this.verifyEmailAddress = err.error.email || this.email;
            this.errorMessage = 'Email address not verified yet. Please enter your 6-digit code.';
            this.resendCode();
          } else {
            this.errorMessage = err.error?.error || 'Authentication failed.';
            this.resetCaptcha();
          }
        }
      });
    }
  }

  onVerifyCodeSubmit(): void {
    if (!this.verifyEmailAddress || !this.verificationCode) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyEmail(this.verifyEmailAddress, this.verificationCode).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.errorMessage = res.error || 'Verification failed.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Invalid or expired verification code.';
      }
    });
  }

  resendCode(): void {
    if (!this.verifyEmailAddress || this.resending || this.resendCountdown > 0) return;

    this.resending = true;
    this.authService.resendVerification(this.verifyEmailAddress).subscribe({
      next: (res) => {
        this.resending = false;
        if (res.success) {
          this.devVerificationCode = res.devVerificationCode || '';
          this.successMessage = res.message || 'A new verification code was sent.';
          this.startResendTimer();
        }
      },
      error: () => {
        this.resending = false;
      }
    });
  }

  startResendTimer(): void {
    this.resendCountdown = 60;
    const interval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  cancelVerification(): void {
    this.isVerifyingEmail = false;
    this.verificationCode = '';
    this.errorMessage = '';
    this.successMessage = '';
    setTimeout(() => {
      this.initGoogleRecaptcha();
      if (this.googleClientId) {
        this.initGoogleAuth();
      }
    }, 100);
  }
}
