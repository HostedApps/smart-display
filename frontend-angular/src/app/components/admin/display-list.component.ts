import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DisplayFleetService } from '../../services/display-fleet.service';
import { AuthService } from '../../services/auth.service';
import { DisplaySummary, Device, User } from '../../models/display.model';

@Component({
  selector: 'app-display-list',
  template: `
    <div class="fleet-layout">
      <!-- Top Navigation Bar -->
      <header class="fleet-header">
        <div class="brand-group">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div>
            <h1 class="brand-title">Smart Display Fleet</h1>
            <p class="brand-subtitle">Manage your digital screens, layouts, and hardware pairings</p>
          </div>
        </div>

        <div class="user-actions">
          <div class="user-chip">
            <div class="user-avatar">{{ (currentUser?.name || 'A')[0] }}</div>
            <span class="user-email">{{ currentUser?.email }}</span>
          </div>
          <button (click)="logout()" class="btn-signout" title="Sign Out">Sign Out</button>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="fleet-content">
        <!-- Action Toolbar -->
        <div class="fleet-toolbar">
          <div class="tab-segments">
            <button [class.active]="activeTab === 'displays'" (click)="activeTab = 'displays'">
              🖥️ Displays & Screens ({{ displays.length }})
            </button>
            <button [class.active]="activeTab === 'devices'" (click)="loadDevices(); activeTab = 'devices'">
              📡 Paired Hardware ({{ devices.length }})
            </button>
          </div>

          <div class="action-buttons">
            <button (click)="openPairModal()" class="btn btn-secondary">
              <span class="btn-icon">⚡</span> Pair Screen with PIN
            </button>
            <button (click)="openCreateModal()" class="btn btn-primary">
              <span class="btn-icon">+</span> New Display
            </button>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div *ngIf="alertMessage" [class]="'alert-banner ' + alertType">
          {{ alertMessage }}
        </div>

        <!-- TAB 1: DISPLAYS GRID -->
        <div *ngIf="activeTab === 'displays'">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading displays...</p>
          </div>

          <div *ngIf="!loading && displays.length === 0" class="empty-state">
            <div class="empty-icon">📺</div>
            <h3>No Displays Created Yet</h3>
            <p>Create your first smart display canvas or pair a TV/iPad to get started.</p>
            <button (click)="openCreateModal()" class="btn btn-primary">+ Create First Display</button>
          </div>

          <div *ngIf="!loading && displays.length > 0" class="displays-grid">
            <div *ngFor="let d of displays" class="display-card">
              <div class="card-preview" (click)="openEditor(d.token)">
                <div class="preview-backdrop">
                  <div class="mini-grid"></div>
                  <div class="preview-info">
                    <span class="orientation-tag">{{ getOrientationLabel(d.orientation) }}</span>
                    <span class="widgets-tag">{{ d.widget_count }} Widgets</span>
                  </div>
                </div>
              </div>

              <div class="card-body">
                <div class="card-header">
                  <h3 class="display-name" (click)="openEditor(d.token)">{{ d.name }}</h3>
                  <span class="device-count-pill" [title]="d.device_count + ' hardware screens active'">
                    📡 {{ d.device_count }}
                  </span>
                </div>
                <p class="display-token">Token: <code>{{ d.token }}</code></p>

                <div class="card-actions">
                  <button (click)="openEditor(d.token)" class="btn-action btn-edit">
                    ✏️ Edit Canvas
                  </button>
                  <button (click)="launchKiosk(d.token)" class="btn-action btn-kiosk" title="Open Kiosk in New Tab">
                    🚀 Launch
                  </button>
                  <button (click)="copyKioskLink(d.token)" class="btn-action btn-copy" title="Copy Kiosk URL">
                    🔗 Copy
                  </button>
                  <button (click)="deleteDisplay(d)" class="btn-action btn-delete" title="Delete Display">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: PAIRED HARDWARE DEVICES -->
        <div *ngIf="activeTab === 'devices'">
          <div *ngIf="loadingDevices" class="loading-state">
            <div class="spinner"></div>
            <p>Loading connected hardware devices...</p>
          </div>

          <div *ngIf="!loadingDevices && devices.length === 0" class="empty-state">
            <div class="empty-icon">📡</div>
            <h3>No Hardware Devices Paired</h3>
            <p>Pair your Amazon Fire TV, Apple iPad, or Raspberry Pi using a simple 6-digit PIN.</p>
            <button (click)="openPairModal()" class="btn btn-primary">⚡ Pair a Screen</button>
          </div>

          <div *ngIf="!loadingDevices && devices.length > 0" class="devices-table-wrap">
            <table class="devices-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Assigned Display</th>
                  <th>IP Address</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let dev of devices">
                  <td class="dev-name-col">
                    <span class="device-icon">📺</span>
                    <strong>{{ dev.device_name }}</strong>
                  </td>
                  <td><span class="display-chip">{{ dev.display_name }}</span></td>
                  <td><code>{{ dev.ip_address || 'Unknown' }}</code></td>
                  <td>{{ dev.last_ping || 'Just now' }}</td>
                  <td>
                    <button (click)="revokeDevice(dev)" class="btn-revoke">Revoke Access</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <!-- MODAL 1: CREATE NEW DISPLAY -->
      <div *ngIf="showCreateModal" class="modal-backdrop" (click)="closeCreateModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Create New Smart Display</h3>
            <button (click)="closeCreateModal()" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Display Name</label>
              <input 
                type="text" 
                [(ngModel)]="newDisplayName" 
                placeholder="e.g. Kitchen iPad / Office TV" 
                class="input-control" 
              />
            </div>

            <div class="form-group">
              <label>Screen Orientation & Resolution</label>
              <select [(ngModel)]="newDisplayOrientation" class="input-control">
                <option value="landscape_720p">Landscape 720p (1280 × 720) - Standard TV</option>
                <option value="landscape_1080p">Landscape 1080p (1920 × 1080) - Full HD TV</option>
                <option value="portrait_720p">Portrait 720p (720 × 1280) - Tablet / Vertical Monitor</option>
                <option value="portrait_1080p">Portrait 1080p (1080 × 1920) - Vertical 4K/FHD</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="closeCreateModal()" class="btn btn-secondary">Cancel</button>
            <button (click)="submitCreateDisplay()" [disabled]="creating" class="btn btn-primary">
              {{ creating ? 'Creating...' : 'Create & Open Editor' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: PAIR DEVICE WITH 6-DIGIT PIN -->
      <div *ngIf="showPairModal" class="modal-backdrop" (click)="closePairModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Pair Screen with 6-Digit PIN</h3>
            <button (click)="closePairModal()" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">
              Open <code>#/pair</code> or launch your kiosk app on your TV/iPad. Enter the 6-digit code shown on screen.
            </p>

            <div class="form-group">
              <label>6-Digit Pairing PIN Code</label>
              <input 
                type="text" 
                [(ngModel)]="pairingCode" 
                placeholder="e.g. SD-8492" 
                maxlength="10"
                class="input-control input-code" 
              />
            </div>

            <div class="form-group">
              <label>Device Friendly Name</label>
              <input 
                type="text" 
                [(ngModel)]="pairingDeviceName" 
                placeholder="e.g. Living Room Fire TV" 
                class="input-control" 
              />
            </div>

            <div class="form-group">
              <label>Assign to Display Profile</label>
              <select [(ngModel)]="pairingDisplayId" class="input-control">
                <option *ngFor="let d of displays" [value]="d.id">{{ d.name }} ({{ getOrientationLabel(d.orientation) }})</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="closePairModal()" class="btn btn-secondary">Cancel</button>
            <button (click)="submitPairDevice()" [disabled]="pairing" class="btn btn-primary">
              {{ pairing ? 'Pairing...' : 'Confirm & Authorize Screen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fleet-layout {
      min-height: 100vh;
      background: #090d16;
      color: #f1f5f9;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      display: flex;
      flex-direction: column;
    }
    .fleet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2));
      border: 1px solid rgba(14, 165, 233, 0.4);
      color: #38bdf8;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(14, 165, 233, 0.3);
    }
    .brand-logo svg {
      width: 24px;
      height: 24px;
    }
    .brand-title {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin: 0;
      color: #ffffff;
    }
    .brand-subtitle {
      font-size: 0.78rem;
      color: #94a3b8;
      margin: 2px 0 0 0;
    }
    .user-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 5px 12px;
      border-radius: 20px;
    }
    .user-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-email {
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .btn-signout {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-signout:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #fff;
    }

    .fleet-content {
      flex: 1;
      padding: 32px;
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .fleet-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .tab-segments {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 3px;
    }
    .tab-segments button {
      background: none;
      border: none;
      color: #94a3b8;
      padding: 8px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-segments button.active {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }
    .action-buttons {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      border: none;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .alert-banner {
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    .alert-banner.success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }
    .alert-banner.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    /* Displays Grid */
    .displays-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }
    .display-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.85));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
    .display-card:hover {
      border-color: rgba(14, 165, 233, 0.4);
      transform: translateY(-3px);
      box-shadow: 0 25px 50px -15px rgba(14, 165, 233, 0.15);
    }
    .card-preview {
      height: 140px;
      background: #000;
      position: relative;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .preview-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.15), transparent 70%);
      padding: 12px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .mini-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
      background-size: 14px 14px;
    }
    .preview-info {
      position: relative;
      z-index: 2;
      display: flex;
      gap: 6px;
    }
    .orientation-tag {
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #38bdf8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .widgets-tag {
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 0.7rem;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .display-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      cursor: pointer;
    }
    .display-name:hover {
      color: #38bdf8;
    }
    .device-count-pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: #4ade80;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.25);
      padding: 2px 8px;
      border-radius: 10px;
    }
    .display-token {
      font-size: 0.75rem;
      color: #64748b;
      margin: 4px 0 16px 0;
    }
    .display-token code {
      color: #94a3b8;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: auto;
    }
    .btn-action {
      flex: 1;
      padding: 7px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .btn-edit {
      background: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.3);
      color: #38bdf8;
    }
    .btn-edit:hover {
      background: #0ea5e9;
      color: #fff;
    }
    .btn-kiosk {
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
    }
    .btn-kiosk:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn-copy {
      background: rgba(255, 255, 255, 0.04);
      color: #94a3b8;
    }
    .btn-copy:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn-delete {
      flex: 0 0 32px;
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    .btn-delete:hover {
      background: #dc2626;
      color: #fff;
    }

    /* Devices Table */
    .devices-table-wrap {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.85));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }
    .devices-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .devices-table th {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px 18px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .devices-table td {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }
    .dev-name-col {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .device-icon { font-size: 1.1rem; }
    .display-chip {
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .btn-revoke {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-revoke:hover {
      background: #dc2626;
      color: #fff;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      width: 100%;
      max-width: 480px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9);
      box-sizing: border-box;
      overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .modal-desc {
      font-size: 0.82rem;
      color: #94a3b8;
      margin: 0 0 4px 0;
      line-height: 1.4;
    }
    .modal-desc code {
      color: #38bdf8;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-group label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
    }
    .input-control:focus {
      outline: none;
      border-color: #0ea5e9;
    }
    .input-code {
      font-family: var(--font-display, monospace);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 3px;
      text-align: center;
      color: #38bdf8;
      text-transform: uppercase;
    }
    .modal-footer {
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 16px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .empty-state h3 { font-size: 1.2rem; color: #fff; margin-bottom: 6px; }
    .empty-state p { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(14, 165, 233, 0.2);
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DisplayListComponent implements OnInit {
  currentUser: User | null = null;
  displays: DisplaySummary[] = [];
  devices: Device[] = [];
  activeTab: 'displays' | 'devices' = 'displays';
  
  loading: boolean = false;
  loadingDevices: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' = 'success';

  // Create Modal
  showCreateModal: boolean = false;
  newDisplayName: string = '';
  newDisplayOrientation: string = 'landscape_720p';
  creating: boolean = false;

  // Pair Modal
  showPairModal: boolean = false;
  pairingCode: string = '';
  pairingDeviceName: string = '';
  pairingDisplayId: number = 0;
  pairing: boolean = false;

  constructor(
    private fleetService: DisplayFleetService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    this.loadDisplays();
  }

  loadDisplays(): void {
    this.loading = true;
    this.fleetService.getDisplays().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.displays = res.displays;
          if (this.displays.length > 0 && !this.pairingDisplayId) {
            this.pairingDisplayId = this.displays[0].id;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.showAlert(err.error?.error || 'Failed to load displays', 'error');
      }
    });
  }

  loadDevices(): void {
    this.loadingDevices = true;
    this.fleetService.listDevices().subscribe({
      next: (res) => {
        this.loadingDevices = false;
        if (res.success) {
          this.devices = res.devices;
        }
      },
      error: (err) => {
        this.loadingDevices = false;
        this.showAlert(err.error?.error || 'Failed to load devices', 'error');
      }
    });
  }

  getOrientationLabel(orientation: string): string {
    switch (orientation) {
      case 'landscape_720p': return '1280×720 Landscape';
      case 'landscape_1080p': return '1920×1080 FHD';
      case 'portrait_720p': return '720×1280 Portrait';
      case 'portrait_1080p': return '1080×1920 Portrait';
      default: return orientation;
    }
  }

  openEditor(token: string): void {
    this.router.navigate(['/admin/editor', token]);
  }

  launchKiosk(token: string): void {
    window.open(`/#/display/${token}`, '_blank');
  }

  copyKioskLink(token: string): void {
    const url = `${window.location.origin}/#/display/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showAlert(`Kiosk URL copied to clipboard: ${url}`, 'success');
    });
  }

  deleteDisplay(d: DisplaySummary): void {
    if (!confirm(`Are you sure you want to delete "${d.name}"? This action cannot be undone.`)) {
      return;
    }

    this.fleetService.deleteDisplay(d.id).subscribe({
      next: () => {
        this.showAlert(`Display "${d.name}" deleted successfully.`, 'success');
        this.loadDisplays();
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Failed to delete display', 'error');
      }
    });
  }

  // Create Modal Methods
  openCreateModal(): void {
    this.newDisplayName = '';
    this.newDisplayOrientation = 'landscape_720p';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreateDisplay(): void {
    if (!this.newDisplayName.trim()) {
      this.showAlert('Please provide a display name.', 'error');
      return;
    }

    this.creating = true;
    this.fleetService.createDisplay(this.newDisplayName, this.newDisplayOrientation).subscribe({
      next: (res) => {
        this.creating = false;
        this.closeCreateModal();
        if (res.success && res.display?.token) {
          this.router.navigate(['/admin/editor', res.display.token]);
        } else {
          this.loadDisplays();
        }
      },
      error: (err) => {
        this.creating = false;
        this.showAlert(err.error?.error || 'Failed to create display', 'error');
      }
    });
  }

  // Pair Modal Methods
  openPairModal(): void {
    this.pairingCode = '';
    this.pairingDeviceName = 'Smart Display Device';
    if (this.displays.length > 0 && !this.pairingDisplayId) {
      this.pairingDisplayId = this.displays[0].id;
    }
    this.showPairModal = true;
  }

  closePairModal(): void {
    this.showPairModal = false;
  }

  submitPairDevice(): void {
    if (!this.pairingCode.trim()) {
      this.showAlert('Please enter the 6-digit pairing code shown on screen.', 'error');
      return;
    }
    if (!this.pairingDisplayId) {
      this.showAlert('Please select a display profile.', 'error');
      return;
    }

    this.pairing = true;
    this.fleetService.pairDevice(this.pairingCode, this.pairingDisplayId, this.pairingDeviceName).subscribe({
      next: (res) => {
        this.pairing = false;
        this.closePairModal();
        this.showAlert(`🎉 Screen successfully bonded to "${res.display_name}"!`, 'success');
        this.loadDisplays();
        this.loadDevices();
      },
      error: (err) => {
        this.pairing = false;
        this.showAlert(err.error?.error || 'Pairing failed. Please check the code.', 'error');
      }
    });
  }

  revokeDevice(dev: Device): void {
    if (!confirm(`Revoke access for "${dev.device_name}"? It will disconnect from the screen.`)) {
      return;
    }

    this.fleetService.revokeDevice(dev.id).subscribe({
      next: () => {
        this.showAlert(`Device "${dev.device_name}" revoked successfully.`, 'success');
        this.loadDevices();
        this.loadDisplays();
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Failed to revoke device', 'error');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage = msg;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = '';
    }, 5000);
  }
}
