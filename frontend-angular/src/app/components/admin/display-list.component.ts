import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { DisplayFleetService } from '../../services/display-fleet.service';
import { EmergencyService } from '../../services/emergency.service';
import { AuthService } from '../../services/auth.service';
import { DisplaySummary, Device, User, DisplayStatus, FleetCommand } from '../../models/display.model';
import { NotificationService } from '../../services/notification.service';

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
          <button *ngIf="currentUser?.role === 'superadmin'" (click)="openSuperAdmin()" class="btn-superadmin-header" title="Open Super Admin Fleet Hub & Security Monitor">
            <app-icon name="crown" [size]="14"></app-icon> Super Admin Hub
          </button>
          <button (click)="showHelpModal = true" class="btn-help-header" title="Open Interactive Documentation & Widget Catalog">
            <app-icon name="book-open" [size]="14"></app-icon> Help & Docs
          </button>
          <button (click)="openInstallationGuide()" class="btn-guide-header" title="Open Client Hardware Installation Guide (Printable PDF)">
            <app-icon name="file-text" [size]="14"></app-icon> Installation PDF
          </button>
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
              <app-icon name="monitor" [size]="14"></app-icon> Displays & Screens ({{ displays.length }})
            </button>
            <button [class.active]="activeTab === 'devices'" (click)="loadDevices(); activeTab = 'devices'">
              <app-icon name="radio-tower" [size]="14"></app-icon> Paired Hardware ({{ devices.length }})
            </button>
          </div>

          <div class="action-buttons">
            <button (click)="openEmergencyModal()" class="btn btn-emergency">
              <span class="btn-icon"><app-icon name="siren" [size]="15"></app-icon></span> Emergency Takeover
            </button>
            <button (click)="openPairModal()" class="btn btn-secondary">
              <span class="btn-icon"><app-icon name="zap" [size]="15"></app-icon></span> Pair Screen with PIN
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

          <ng-container *ngIf="!loading && displays.length > 0">
            <!-- Fleet health at a glance -->
            <div class="fleet-summary" role="status">
              <span class="summary-item"><span class="status-dot online"></span>{{ countByStatus('online') }} online</span>
              <span class="summary-item"><span class="status-dot stale"></span>{{ countByStatus('stale') }} not seen recently</span>
              <span class="summary-item"><span class="status-dot offline"></span>{{ countByStatus('offline') }} offline</span>
              <span class="summary-item"><span class="status-dot never"></span>{{ countByStatus('never') }} never connected</span>
              <label class="select-all">
                <input type="checkbox" [checked]="allSelected" [indeterminate]="selectedIds.size > 0 && !allSelected" (change)="toggleSelectAll()" /> Select all
              </label>
            </div>

            <!-- Bulk actions for the selected displays -->
            <div class="bulk-bar" *ngIf="selectedIds.size > 0" role="toolbar" aria-label="Actions for selected displays">
              <strong>{{ selectedIds.size }} selected</strong>
              <button type="button" class="btn-action" (click)="bulkCommand('reload')"><app-icon name="rotate-cw" [size]="13"></app-icon> Reload</button>
              <button type="button" class="btn-action" (click)="bulkCommand('identify')"><app-icon name="scan-eye" [size]="13"></app-icon> Identify</button>
              <button type="button" class="btn-action" (click)="bulkCommand('sleep')"><app-icon name="moon" [size]="13"></app-icon> Sleep</button>
              <button type="button" class="btn-action" (click)="bulkCommand('wake')"><app-icon name="sun" [size]="13"></app-icon> Wake</button>
              <button type="button" class="btn-action" (click)="bulkCommand('screenshot')"><app-icon name="camera" [size]="13"></app-icon> Refresh thumbnails</button>
              <button type="button" class="btn-action" (click)="openCopyLayout(null)"><app-icon name="copy" [size]="13"></app-icon> Apply a layout…</button>
              <button type="button" class="btn-link-plain" (click)="selectedIds.clear()">Clear</button>
            </div>

            <div class="displays-grid">
            <div *ngFor="let d of displays; trackBy: trackById" class="display-card" [class.selected]="selectedIds.has(d.id)">
              <div class="card-preview" (click)="openEditor(d.token)" [title]="'Edit ' + d.name">
                <img *ngIf="thumbnails[d.id]" class="thumb-img" [src]="thumbnails[d.id]" [alt]="'Screenshot of ' + d.name" />
                <div class="preview-backdrop" *ngIf="!thumbnails[d.id]">
                  <div class="mini-grid"></div>
                  <span class="no-thumb">{{ d.status === 'never' ? 'Not connected yet' : 'No screenshot yet' }}</span>
                </div>
                <span class="status-pill" [ngClass]="d.status || 'never'">
                  <span class="status-dot" [ngClass]="d.status || 'never'"></span>{{ statusLabel(d) }}
                </span>
                <label class="card-select" (click)="$event.stopPropagation()" [title]="'Select ' + d.name">
                  <input type="checkbox" [checked]="selectedIds.has(d.id)" (change)="toggleSelected(d.id)" [attr.aria-label]="'Select ' + d.name" />
                </label>
              </div>

              <div class="card-body">
                <div class="card-header">
                  <h3 class="display-name" (click)="openEditor(d.token)">{{ d.name }}</h3>
                  <span class="device-count-pill" [title]="d.device_count + ' paired hardware screen(s)'">
                    <app-icon name="radio-tower" [size]="13"></app-icon> {{ d.device_count }}
                  </span>
                </div>
                <p class="card-meta">
                  <span>{{ lastSeenText(d) }}</span>
                  <span *ngIf="d.client?.viewport_w">· {{ d.client?.viewport_w }}×{{ d.client?.viewport_h }}</span>
                  <span *ngIf="d.client?.app_version">· v{{ d.client?.app_version }}</span>
                  <span *ngIf="d.client?.perf_mode" title="Performance mode is on (low-power device)">· Low-power</span>
                  <span *ngIf="d.client?.sleeping">· Sleeping</span>
                </p>
                <p class="card-meta subtle">{{ getOrientationLabel(d.orientation) }} · {{ d.widget_count }} widgets</p>

                <div class="card-actions">
                  <button (click)="openEditor(d.token)" class="btn-action btn-edit">
                    <app-icon name="pencil" [size]="13"></app-icon> Edit
                  </button>
                  <button (click)="launchKiosk(d.token)" class="btn-action btn-kiosk" title="Open the live display in a new tab">
                    <app-icon name="rocket" [size]="13"></app-icon> Launch
                  </button>
                  <button (click)="sendCommand(d, 'reload')" class="btn-action" title="Reload the display remotely" [disabled]="d.status === 'never'">
                    <app-icon name="rotate-cw" [size]="13"></app-icon> Reload
                  </button>
                  <div class="menu-wrap">
                    <button type="button" class="btn-action" (click)="toggleMenu(d.id, $event)" [attr.aria-expanded]="openMenuId === d.id" aria-haspopup="menu" [attr.aria-label]="'More actions for ' + d.name">
                      <app-icon name="ellipsis" [size]="14"></app-icon>
                    </button>
                    <div class="card-menu" *ngIf="openMenuId === d.id" role="menu" (click)="$event.stopPropagation()">
                      <button role="menuitem" (click)="sendCommand(d, 'identify')"><app-icon name="scan-eye" [size]="14"></app-icon> Identify on screen</button>
                      <button role="menuitem" (click)="sendCommand(d, d.client?.sleeping ? 'wake' : 'sleep')"><app-icon [name]="d.client?.sleeping ? 'sun' : 'moon'" [size]="14"></app-icon> {{ d.client?.sleeping ? 'Wake screen' : 'Put to sleep' }}</button>
                      <button role="menuitem" (click)="sendCommand(d, 'screenshot')"><app-icon name="camera" [size]="14"></app-icon> Refresh screenshot</button>
                      <hr />
                      <button role="menuitem" (click)="duplicate(d)"><app-icon name="copy-plus" [size]="14"></app-icon> Duplicate display</button>
                      <button role="menuitem" (click)="openCopyLayout(d)"><app-icon name="copy" [size]="14"></app-icon> Copy layout to other displays…</button>
                      <button role="menuitem" (click)="copyKioskLink(d.token)"><app-icon name="external-link" [size]="14"></app-icon> Copy kiosk link</button>
                      <button role="menuitem" (click)="copyWallDropLink(d.token)"><app-icon name="smartphone" [size]="14"></app-icon> Copy WallDrop link</button>
                      <hr />
                      <button role="menuitem" class="danger" (click)="deleteDisplay(d)"><app-icon name="trash-2" [size]="14"></app-icon> Delete display</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </ng-container>
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
            <button (click)="openPairModal()" class="btn btn-primary"><app-icon name="zap" [size]="15"></app-icon> Pair a Screen</button>
          </div>

          <div *ngIf="!loadingDevices && devices.length > 0" class="devices-table-wrap">
            <table class="devices-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Assigned Display</th>
                  <th>IP Address</th>
                  <th>Status</th>
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
                  <td>
                    <span class="status-inline"><span class="status-dot" [ngClass]="dev.status || 'never'"></span>{{ deviceStatusText(dev) }}</span>
                  </td>
                  <td>
                    <button (click)="revokeDevice(dev)" class="btn-revoke">Revoke Access</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <!-- Copy a layout to other displays -->
      <div *ngIf="copyLayout.open" class="modal-backdrop" (click)="copyLayout.open = false">
        <div class="modal-card copy-modal" role="dialog" aria-modal="true" aria-labelledby="copy-title" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 id="copy-title">Copy a layout</h2>
            <button type="button" class="modal-close" (click)="copyLayout.open = false" aria-label="Close"><app-icon name="x" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
          <p class="modal-desc">The chosen displays get an exact copy of the source layout, theme, pages and settings. Their names, links and paired screens stay the same.</p>
          <div class="form-group">
          <label for="copy-source">Copy from</label>
          <select id="copy-source" class="input-control" [(ngModel)]="copyLayout.sourceId">
            <option *ngFor="let d of displays" [ngValue]="d.id">{{ d.name }} ({{ d.widget_count }} widgets)</option>
          </select>
          </div>
          <label class="copy-label">Apply to</label>
          <div class="copy-targets">
            <label *ngFor="let d of displays" [class.disabled]="d.id === copyLayout.sourceId">
              <input type="checkbox" [disabled]="d.id === copyLayout.sourceId" [checked]="copyLayout.targets.has(d.id) && d.id !== copyLayout.sourceId" (change)="toggleCopyTarget(d.id)" /> {{ d.name }}
            </label>
          </div>
          <div class="copy-actions">
            <button type="button" class="btn btn-secondary" (click)="copyLayout.open = false">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="copyTargetIds.length === 0 || copyLayout.busy" (click)="confirmCopyLayout()">
              {{ copyLayout.busy ? 'Copying…' : 'Replace ' + copyTargetIds.length + ' layout' + (copyTargetIds.length === 1 ? '' : 's') }}
            </button>
          </div>
          </div>
        </div>
      </div>

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
                <option value="landscape_720p">Landscape 720p (1280 × 720) - Standard HD</option>
                <option value="landscape_1080p">Landscape 1080p (1920 × 1080) - Full HD</option>
                <option value="landscape_1440p">Landscape 1440p (2560 × 1440) - 2K QHD (Your Monitor)</option>
                <option value="landscape_4k">Landscape 4K (3840 × 2160) - 4K Ultra HD</option>
                <option value="portrait_720p">Portrait 720p (720 × 1280) - Vertical HD</option>
                <option value="portrait_1080p">Portrait 1080p (1080 × 1920) - Vertical Full HD</option>
                <option value="portrait_1440p">Portrait 1440p (1440 × 2560) - Vertical 2K QHD</option>
                <option value="portrait_4k">Portrait 4K (2160 × 3840) - Vertical 4K</option>
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

      <!-- MODAL 3: 1-CLICK EMERGENCY BROADCAST TAKEOVER -->
      <div *ngIf="showEmergencyModal" class="modal-backdrop" (click)="closeEmergencyModal()">
        <div class="modal-card modal-emergency-card" (click)="$event.stopPropagation()">
          <div class="modal-header modal-emergency-header">
            <div class="emergency-header-title">
              <span class="emergency-siren-emoji">🚨</span>
              <h3>1-Click Emergency Fleet Takeover</h3>
            </div>
            <button (click)="closeEmergencyModal()" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">
              Instantly broadcast an urgent priority alert across all connected TVs, iPads, and digital wall displays in your fleet.
            </p>

            <div class="form-group">
              <label>Alert Severity</label>
              <div class="severity-toggle">
                <button 
                  type="button"
                  [class.active]="emergencySeverity === 'warning'" 
                  (click)="emergencySeverity = 'warning'"
                  class="btn-sev btn-sev-warning"
                >
                  ⚠️ Warning (Amber)
                </button>
                <button 
                  type="button"
                  [class.active]="emergencySeverity === 'critical'" 
                  (click)="emergencySeverity = 'critical'"
                  class="btn-sev btn-sev-critical"
                >
                  🛑 Critical (Red Emergency)
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Urgent Headline</label>
              <input 
                type="text" 
                [(ngModel)]="emergencyTitle" 
                placeholder="e.g. SEVERE WEATHER WARNING / MEETING SHIFT" 
                class="input-control" 
              />
            </div>

            <div class="form-group">
              <label>Alert Details / Instructions</label>
              <textarea 
                [(ngModel)]="emergencyMessage" 
                placeholder="e.g. Thunderstorm advisory in effect until 7:00 PM. Bring pets inside." 
                rows="3"
                class="input-control" 
              ></textarea>
            </div>

            <div class="form-group">
              <label>Target Screens</label>
              <select [(ngModel)]="emergencyTargetDisplayId" class="input-control">
                <option [ngValue]="null">🌐 All Screens Across Fleet (Broadcast Everywhere)</option>
                <option *ngFor="let d of displays" [ngValue]="d.id">🖥️ Only: {{ d.name }}</option>
              </select>
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" [(ngModel)]="emergencyPlaySound" /> Play Audible Alarm Chime on Screens
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button (click)="dismissActiveEmergency()" class="btn btn-secondary">Clear Active Alert</button>
            <button (click)="submitEmergencyBroadcast()" [disabled]="broadcasting" class="btn btn-emergency-send">
              {{ broadcasting ? 'Transmitting...' : '🚨 Transmit Alert Now' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Help & Documentation Modal -->
      <app-help-docs-modal *ngIf="showHelpModal" (closed)="showHelpModal = false"></app-help-docs-modal>
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
    .btn-superadmin-header {
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.25));
      border: 1px solid rgba(234, 179, 8, 0.5);
      color: #fef08a;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 0 12px rgba(234, 179, 8, 0.25);
      transition: all 0.2s;
    }
    .btn-superadmin-header:hover {
      background: linear-gradient(135deg, #eab308, #ca8a04);
      color: #000;
      box-shadow: 0 0 18px rgba(234, 179, 8, 0.6);
    }
    .btn-help-header {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-help-header:hover {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }
    .btn-guide-header {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-guide-header:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
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
      aspect-ratio: 16 / 9;
      background: #000;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .thumb-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .no-thumb {
      position: relative;
      z-index: 2;
      margin: auto;
      font-size: 0.8rem;
      color: #64748b;
    }
    .status-pill {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 3;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
      flex-shrink: 0;
    }
    .status-dot.online { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25); }
    .status-dot.stale { background: #f59e0b; }
    .status-dot.offline { background: #ef4444; }
    .status-dot.never { background: #64748b; }
    .status-inline { display: inline-flex; align-items: center; gap: 8px; }
    .card-select {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 3;
      display: flex;
      padding: 6px;
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.7);
      cursor: pointer;
    }
    .card-select input { width: 16px; height: 16px; cursor: pointer; }
    .display-card.selected { border-color: #38bdf8; box-shadow: 0 0 0 1px #38bdf8, 0 20px 40px -15px rgba(0, 0, 0, 0.6); }
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: #cbd5e1;
    }
    .card-meta.subtle { color: #64748b; font-size: 0.74rem; margin-bottom: 12px; }
    .fleet-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 18px;
      margin-bottom: 16px;
      font-size: 0.82rem;
      color: #cbd5e1;
    }
    .summary-item { display: inline-flex; align-items: center; gap: 8px; }
    .select-all { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: #94a3b8; }
    .bulk-bar {
      position: sticky;
      top: 8px;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      border-radius: 12px;
      background: #0f2740;
      border: 1px solid rgba(56, 189, 248, 0.45);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      font-size: 0.85rem;
    }
    .bulk-bar strong { margin-right: 6px; }
    .btn-link-plain { background: none; border: none; color: #94a3b8; text-decoration: underline; cursor: pointer; margin-left: auto; }
    .menu-wrap { position: relative; display: flex; }
    .card-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 6px);
      z-index: 20;
      min-width: 240px;
      padding: 6px;
      border-radius: 10px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    }
    .card-menu button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      border-radius: 6px;
      background: none;
      color: #e2e8f0;
      font-size: 0.82rem;
      text-align: left;
      cursor: pointer;
    }
    .card-menu button:hover, .card-menu button:focus-visible { background: rgba(56, 189, 248, 0.12); outline: none; }
    .card-menu button.danger { color: #f87171; }
    .card-menu hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 4px 0; }
    .btn-action:disabled { opacity: 0.45; cursor: not-allowed; }
    .copy-modal { max-width: 520px; }
    .copy-label { display: block; margin: 12px 0 6px; font-size: 0.8rem; font-weight: 600; color: #cbd5e1; }
    .copy-targets {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 220px;
      overflow-y: auto;
      padding: 10px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.85rem;
    }
    .copy-targets label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .copy-targets label.disabled { opacity: 0.4; cursor: default; }
    .copy-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
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
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-action:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .bulk-bar .btn-action {
      flex: none;
    }
    .menu-wrap {
      flex: none;
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
    .btn-emergency {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-weight: 700;
    }
    .btn-emergency:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fff;
    }
    .modal-emergency-card {
      max-width: 520px;
      border: 1px solid rgba(239, 68, 68, 0.4);
      box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25);
    }
    .modal-emergency-header {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(0, 0, 0, 0.4));
    }
    .emergency-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .severity-toggle {
      display: flex;
      gap: 8px;
    }
    .btn-sev {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.3);
      color: #94a3b8;
      transition: all 0.2s;
    }
    .btn-sev-warning.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      color: #fbbf24;
    }
    .btn-sev-critical.active {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #f87171;
    }
    .btn-emergency-send {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      font-weight: 700;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
    }
    .btn-walldrop {
      background: rgba(14, 165, 233, 0.12);
      color: #38bdf8;
    }
    .btn-walldrop:hover {
      background: rgba(14, 165, 233, 0.25);
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
export class DisplayListComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  displays: DisplaySummary[] = [];
  devices: Device[] = [];
  activeTab: 'displays' | 'devices' = 'displays';
  
  loading: boolean = false;
  loadingDevices: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' = 'success';
  showHelpModal: boolean = false;

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

  // Emergency Takeover Modal
  showEmergencyModal: boolean = false;
  emergencySeverity: 'warning' | 'critical' = 'warning';
  emergencyTitle: string = 'SEVERE WEATHER ADVISORY';
  emergencyMessage: string = 'Thunderstorm warning in effect. High winds expected.';
  emergencyTargetDisplayId: number | null = null;
  emergencyPlaySound: boolean = true;
  broadcasting: boolean = false;

  constructor(
    private fleetService: DisplayFleetService,
    private emergencyService: EmergencyService,
    private authService: AuthService,
    private router: Router,
    private notifications: NotificationService
  ) {}

  // ---- Fleet hub state ----
  selectedIds = new Set<number>();
  openMenuId: number | null = null;
  /** Screenshot data URLs by display id */
  thumbnails: Record<number, string> = {};
  private thumbnailVersions: Record<number, string> = {};
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  copyLayout = { open: false, sourceId: 0, targets: new Set<number>(), busy: false };

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    this.loadDisplays();
    // Keep online status and screenshots fresh while the page is open
    this.refreshTimer = setInterval(() => this.loadDisplays(true), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.openMenuId = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenuId = null;
    this.copyLayout.open = false;
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  trackById(_: number, d: DisplaySummary): number {
    return d.id;
  }

  countByStatus(status: DisplayStatus): number {
    return this.displays.filter(d => (d.status || 'never') === status).length;
  }

  statusLabel(d: DisplaySummary): string {
    switch (d.status) {
      case 'online': return d.client?.sleeping ? 'Online · asleep' : 'Online';
      case 'stale': return 'Not seen recently';
      case 'offline': return 'Offline';
      default: return 'Never connected';
    }
  }

  lastSeenText(d: { last_seen_at?: string | null; status?: DisplayStatus }): string {
    if (!d.last_seen_at) return 'Never connected';
    return (d.status === 'online' ? 'Seen ' : 'Last seen ') + this.relativeTime(d.last_seen_at);
  }

  deviceStatusText(dev: Device): string {
    const label = dev.status === 'online' ? 'Online' : dev.status === 'stale' ? 'Not seen recently' : dev.status === 'offline' ? 'Offline' : 'Never connected';
    return dev.last_seen_at ? `${label} · ${this.relativeTime(dev.last_seen_at)}` : label;
  }

  private relativeTime(iso: string): string {
    const t = new Date(iso.replace(' ', 'T')).getTime();
    if (!Number.isFinite(t)) return '';
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 60) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 48) return `${hr} h ago`;
    return `${Math.round(hr / 24)} days ago`;
  }

  get allSelected(): boolean {
    return this.displays.length > 0 && this.selectedIds.size === this.displays.length;
  }

  toggleSelected(id: number): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.displays.forEach(d => this.selectedIds.add(d.id));
  }

  sendCommand(d: DisplaySummary, command: FleetCommand): void {
    this.openMenuId = null;
    this.queueCommand([d], command);
  }

  bulkCommand(command: FleetCommand): void {
    this.queueCommand(this.displays.filter(d => this.selectedIds.has(d.id)), command);
  }

  private queueCommand(targets: DisplaySummary[], command: FleetCommand): void {
    if (targets.length === 0) return;
    const verbs: Record<string, string> = { reload: 'Reload', identify: 'Identify', sleep: 'Sleep', wake: 'Wake', screenshot: 'Screenshot', goto_page: 'Page change' };
    this.fleetService.sendCommand(targets.map(t => t.token), command).subscribe({
      next: () => {
        if (command === 'sleep' || command === 'wake') {
          // Reflect the change straight away; the next heartbeat confirms it
          targets.forEach(t => t.client = { ...(t.client || {}), sleeping: command === 'sleep' });
        }
        const offline = targets.filter(t => t.status !== 'online').length;
        const who = targets.length === 1 ? `"${targets[0].name}"` : `${targets.length} displays`;
        this.notifications.success(`${verbs[command]} sent to ${who}.` + (offline ? ` ${offline} not online — it will apply if they reconnect within 2 minutes.` : ''));
        if (command === 'screenshot') setTimeout(() => this.loadDisplays(true), 8000);
      },
      error: (err) => this.notifications.error(err.error?.error || 'Could not send the command.')
    });
  }

  duplicate(d: DisplaySummary): void {
    this.openMenuId = null;
    this.fleetService.duplicateDisplay(d.id).subscribe({
      next: (res) => {
        this.notifications.success(`Created "${res.display?.name || d.name + ' (copy)'}".`);
        this.loadDisplays(true);
      },
      error: (err) => this.notifications.error(err.error?.error || 'Could not duplicate the display.')
    });
  }

  openCopyLayout(source: DisplaySummary | null): void {
    this.openMenuId = null;
    const sourceId = source?.id ?? this.displays[0]?.id ?? 0;
    const targets = new Set<number>(source ? [] : this.selectedIds);
    targets.delete(sourceId);
    this.copyLayout = { open: true, sourceId, targets, busy: false };
  }

  toggleCopyTarget(id: number): void {
    const t = this.copyLayout.targets;
    t.has(id) ? t.delete(id) : t.add(id);
  }

  get copyTargetIds(): number[] {
    return [...this.copyLayout.targets].filter(id => id !== this.copyLayout.sourceId);
  }

  async confirmCopyLayout(): Promise<void> {
    const source = this.displays.find(d => d.id === this.copyLayout.sourceId);
    const targets = this.copyTargetIds;
    if (!source || targets.length === 0) return;
    const ok = await this.notifications.confirm(
      `The current layout of ${targets.length} display${targets.length === 1 ? '' : 's'} will be replaced with "${source.name}". Each display's version history keeps its previous layout only if it was published from the editor.`,
      { title: 'Replace layouts?', confirmLabel: 'Replace', danger: true }
    );
    if (!ok) return;
    this.copyLayout.busy = true;
    this.fleetService.copyLayout(source.id, targets).subscribe({
      next: (res) => {
        this.copyLayout = { open: false, sourceId: 0, targets: new Set(), busy: false };
        this.notifications.success(`Layout copied to ${res.copied} display${res.copied === 1 ? '' : 's'}. Screens update within a few seconds.`);
        this.loadDisplays(true);
      },
      error: (err) => {
        this.copyLayout.busy = false;
        this.notifications.error(err.error?.error || 'Could not copy the layout.');
      }
    });
  }

  /** Fetch screenshots that are new or changed since the last refresh */
  private refreshThumbnails(): void {
    for (const d of this.displays) {
      if (!d.has_thumbnail || !d.thumbnail_at || this.thumbnailVersions[d.id] === d.thumbnail_at) continue;
      this.thumbnailVersions[d.id] = d.thumbnail_at;
      this.fleetService.getThumbnail(d.id).subscribe({
        next: res => { if (res?.data_url) this.thumbnails[d.id] = res.data_url; },
        error: () => { delete this.thumbnailVersions[d.id]; }
      });
    }
  }

  loadDisplays(silent = false): void {
    this.loading = !silent && this.displays.length === 0;
    this.fleetService.getDisplays().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.displays = res.displays;
          const ids = new Set(this.displays.map(d => d.id));
          [...this.selectedIds].forEach(id => { if (!ids.has(id)) this.selectedIds.delete(id); });
          this.refreshThumbnails();
          if (this.displays.length > 0 && !this.pairingDisplayId) {
            this.pairingDisplayId = this.displays[0].id;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        if (!silent) this.showAlert(err.error?.error || 'Failed to load displays', 'error');
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
      case 'landscape_720p': return '1280×720 HD';
      case 'landscape_1080p': return '1920×1080 FHD';
      case 'landscape_1440p': return '2560×1440 2K QHD';
      case 'landscape_4k': return '3840×2160 4K UHD';
      case 'portrait_720p': return '720×1280 Portrait';
      case 'portrait_1080p': return '1080×1920 Portrait';
      case 'portrait_1440p': return '1440×2560 2K Portrait';
      case 'portrait_4k': return '2160×3840 4K Portrait';
      default: return orientation;
    }
  }

  openInstallationGuide(): void {
    this.router.navigate(['/docs/installation']);
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

  async deleteDisplay(d: DisplaySummary): Promise<void> {
    const confirmed = await this.notifications.confirm(
      `"${d.name}" and its layout will be permanently deleted. This action cannot be undone.`,
      { title: 'Delete display?', confirmLabel: 'Delete', danger: true }
    );
    if (!confirmed) {
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

  async revokeDevice(dev: Device): Promise<void> {
    const confirmed = await this.notifications.confirm(
      `"${dev.device_name}" will be disconnected from its screen and must be paired again.`,
      { title: 'Revoke device access?', confirmLabel: 'Revoke', danger: true }
    );
    if (!confirmed) {
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

  copyWallDropLink(token: string): void {
    const url = `${window.location.origin}/#/drop/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showAlert(`📲 WallDrop Mobile URL copied: ${url}`, 'success');
    });
  }

  // Emergency Modal Methods
  openEmergencyModal(): void {
    this.emergencyTitle = 'SEVERE WEATHER ADVISORY';
    this.emergencyMessage = 'Thunderstorm warning in effect until 7:00 PM. High winds expected.';
    this.emergencySeverity = 'warning';
    this.emergencyTargetDisplayId = null;
    this.emergencyPlaySound = true;
    this.showEmergencyModal = true;
  }

  closeEmergencyModal(): void {
    this.showEmergencyModal = false;
  }

  submitEmergencyBroadcast(): void {
    if (!this.emergencyTitle.trim() || !this.emergencyMessage.trim()) {
      this.showAlert('Please provide both an emergency headline and message.', 'error');
      return;
    }

    this.broadcasting = true;
    this.emergencyService.triggerBroadcast({
      title: this.emergencyTitle,
      message: this.emergencyMessage,
      severity: this.emergencySeverity,
      play_sound: this.emergencyPlaySound,
      display_id: this.emergencyTargetDisplayId
    }).subscribe({
      next: (_res: any) => {
        this.broadcasting = false;
        this.closeEmergencyModal();
        this.showAlert('🚨 Priority Emergency Broadcast transmitted across your fleet!', 'success');
      },
      error: (err: any) => {
        this.broadcasting = false;
        this.showAlert(err.error?.error || 'Failed to transmit broadcast.', 'error');
      }
    });
  }

  dismissActiveEmergency(): void {
    this.emergencyService.dismissBroadcast().subscribe({
      next: () => {
        this.closeEmergencyModal();
        this.showAlert('Active emergency broadcasts cleared from all screens.', 'success');
      },
      error: (err: any) => {
        this.showAlert(err.error?.error || 'Failed to clear broadcasts.', 'error');
      }
    });
  }

  openSuperAdmin(): void {
    this.router.navigate(['/admin/superadmin']);
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
