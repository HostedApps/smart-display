import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { DisplayFleetService } from '../../services/display-fleet.service';
import { WakeLockService } from '../../services/wake-lock.service';

@Component({
  selector: 'app-device-pairing',
  template: `
    <div class="pairing-container">
      <div class="pairing-card">
        <div class="pairing-brand">
          <div class="brand-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h1>Smart Display Setup</h1>
          <p class="tagline">Pair this screen to your Smart Display cloud account</p>
        </div>

        <div *ngIf="loading" class="pairing-loading">
          <div class="pulse-ring"></div>
          <p>Generating secure pairing PIN...</p>
        </div>

        <div *ngIf="!loading && pairingCode" class="code-box">
          <span class="code-label">ENTER PAIRING CODE IN ADMIN DASHBOARD</span>
          <div class="code-digits">{{ pairingCode }}</div>
          <div class="status-indicator">
            <span class="live-dot"></span>
            <span>Waiting for authorization on admin dashboard...</span>
          </div>
        </div>

        <div class="pairing-instructions">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-text">Open your admin dashboard on a computer or phone: <code>{{ adminUrl }}</code></div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-text">Click <strong>"⚡ Pair Screen with PIN"</strong> and enter the 6-digit code above.</div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-text">This screen will instantly connect and load your chosen dashboard layout.</div>
          </div>
        </div>

        <div class="pairing-footer">
          <button (click)="refreshCode()" class="btn-refresh" title="Generate New Code">
            🔄 Get New Code
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pairing-container {
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, #0f172a 0%, #06090e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #f1f5f9;
      padding: 24px;
      box-sizing: border-box;
    }
    .pairing-card {
      width: 100%;
      max-width: 620px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(24px);
      text-align: center;
      box-sizing: border-box;
    }
    .pairing-brand {
      margin-bottom: 28px;
    }
    .brand-badge {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2));
      border: 1px solid rgba(14, 165, 233, 0.4);
      color: #38bdf8;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(14, 165, 233, 0.35);
    }
    .brand-badge svg {
      width: 30px;
      height: 30px;
    }
    h1 {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #ffffff;
    }
    .tagline {
      font-size: 0.95rem;
      color: #94a3b8;
      margin-top: 6px;
    }

    .code-box {
      background: rgba(0, 0, 0, 0.45);
      border: 2px dashed rgba(14, 165, 233, 0.4);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
    }
    .code-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .code-digits {
      font-family: var(--font-display, 'Outfit', monospace);
      font-size: 3.8rem;
      font-weight: 800;
      letter-spacing: 8px;
      color: #38bdf8;
      text-shadow: 0 0 30px rgba(56, 189, 248, 0.6);
      line-height: 1;
      margin: 6px 0 16px 0;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #cbd5e1;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .pairing-instructions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 20px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0ea5e9;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .step-text code {
      color: #38bdf8;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .btn-refresh {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-refresh:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .pairing-loading {
      padding: 40px 0;
    }
    .pulse-ring {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(14, 165, 233, 0.3);
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DevicePairingComponent implements OnInit, OnDestroy {
  pairingCode: string = '';
  deviceSecret: string = '';
  loading: boolean = true;
  adminUrl: string = '';
  private pollSub?: Subscription;

  constructor(
    private fleetService: DisplayFleetService,
    private wakeLock: WakeLockService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminUrl = window.location.origin + '/#/admin/displays';
    this.wakeLock.requestWakeLock();
    this.refreshCode();
  }

  refreshCode(): void {
    this.loading = true;
    this.pollSub?.unsubscribe();

    this.fleetService.generatePairingCode().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.pairingCode = res.pairing_code;
          this.deviceSecret = res.device_secret;
          this.startPolling();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    // Poll pairing status every 3 seconds
    this.pollSub = interval(3000).subscribe(() => {
      if (!this.deviceSecret) return;
      this.fleetService.checkPairingStatus(this.deviceSecret).subscribe({
        next: (res) => {
          if (res.status === 'paired' && res.display_token) {
            this.pollSub?.unsubscribe();
            if (res.device_token) {
              localStorage.setItem('device_token', res.device_token);
            }
            // Automatically navigate to paired display!
            this.router.navigate(['/display', res.display_token]);
          } else if (res.status === 'expired') {
            this.refreshCode();
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
