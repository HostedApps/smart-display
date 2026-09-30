import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuperAdminService } from '../../services/super-admin.service';
import { AuthService } from '../../services/auth.service';
import { SuperAdminStats, User, UserActivityLog } from '../../models/display.model';

@Component({
  selector: 'app-super-admin',
  template: `
    <div class="superadmin-layout">
      <!-- Header -->
      <header class="superadmin-header">
        <div class="brand-group">
          <button (click)="goBack()" class="btn-back" title="Back to Fleet">
            ← Fleet Dashboard
          </button>
          <div class="crown-icon">👑</div>
          <div>
            <h1 class="brand-title">Super Admin Control Hub</h1>
            <p class="brand-subtitle">Fleet-wide user activity monitoring, capacity limits & security controls</p>
          </div>
        </div>

        <div class="header-actions">
          <button (click)="openPasswordModal()" class="btn btn-secondary">
            🔑 Change Password
          </button>
          <button (click)="refreshAll()" class="btn btn-secondary" [disabled]="loading">
            🔄 Refresh Data
          </button>
          <div class="super-badge">
            <span class="live-dot"></span> SUPERADMIN
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="superadmin-content">
        <!-- Error / Success Alert -->
        <div *ngIf="errorMessage" class="alert alert-error">
          ⚠️ {{ errorMessage }}
          <button (click)="errorMessage = ''" class="alert-close">×</button>
        </div>
        <div *ngIf="successMessage" class="alert alert-success">
          ✅ {{ successMessage }}
          <button (click)="successMessage = ''" class="alert-close">×</button>
        </div>

        <!-- System Quota & Metrics Grid -->
        <div class="metrics-grid">
          <!-- 50-User Quota Card -->
          <div class="metric-card quota-card">
            <div class="metric-header">
              <span class="metric-title">System User Capacity</span>
              <span class="metric-badge" [class.badge-full]="(stats?.totalUsers || 0) >= (stats?.maxCapacity || 50)">
                {{ stats?.totalUsers || 0 }} / {{ stats?.maxCapacity || 50 }} Users
              </span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" [style.width.%]="stats?.capacityUsedPercent || 0"
                   [class.progress-amber]="(stats?.capacityUsedPercent || 0) >= 70 && (stats?.capacityUsedPercent || 0) < 90"
                   [class.progress-red]="(stats?.capacityUsedPercent || 0) >= 90">
              </div>
            </div>
            <div class="quota-footer">
              <span>{{ (stats?.maxCapacity || 50) - (stats?.totalUsers || 0) }} slots remaining</span>
              <span>{{ stats?.capacityUsedPercent || 0 }}% Allocated</span>
            </div>
          </div>

          <!-- Active Users -->
          <div class="metric-card">
            <div class="metric-icon">🟢</div>
            <div class="metric-data">
              <div class="metric-value">{{ stats?.activeUsers || 0 }}</div>
              <div class="metric-label">Active Users</div>
            </div>
          </div>

          <!-- Verified Emails -->
          <div class="metric-card">
            <div class="metric-icon">✉️</div>
            <div class="metric-data">
              <div class="metric-value">{{ stats?.verifiedUsers || 0 }}</div>
              <div class="metric-label">Verified Emails</div>
            </div>
          </div>

          <!-- Total Displays -->
          <div class="metric-card">
            <div class="metric-icon">🖥️</div>
            <div class="metric-data">
              <div class="metric-value">{{ stats?.totalDisplays || 0 }}</div>
              <div class="metric-label">Total Displays</div>
            </div>
          </div>

          <!-- Total Widgets -->
          <div class="metric-card">
            <div class="metric-icon">🧩</div>
            <div class="metric-data">
              <div class="metric-value">{{ stats?.totalWidgets || 0 }}</div>
              <div class="metric-label">Total Widgets</div>
            </div>
          </div>

          <!-- 24h Activity Log count -->
          <div class="metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-data">
              <div class="metric-value">{{ stats?.recentActivities24h || 0 }}</div>
              <div class="metric-label">Actions (Last 24h)</div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tab-toolbar">
          <div class="tab-segments">
            <button [class.active]="activeTab === 'users'" (click)="activeTab = 'users'">
              👥 Registered Users ({{ filteredUsers.length }})
            </button>
            <button [class.active]="activeTab === 'activities'" (click)="loadActivities(); activeTab = 'activities'">
              📜 Live Activity Audit Trail ({{ activities.length }})
            </button>
          </div>

          <div *ngIf="activeTab === 'users'" class="search-box">
            <input type="text" [(ngModel)]="searchQuery" (input)="filterUsers()" placeholder="Search users by name or email..." class="search-input" />
          </div>
        </div>

        <!-- TAB 1: USERS MANAGEMENT TABLE -->
        <div *ngIf="activeTab === 'users'" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email Verified</th>
                <th>Auth Provider</th>
                <th>Displays / Widgets</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ (u.name || 'U')[0] }}</div>
                    <div>
                      <div class="user-name">{{ u.name }}</div>
                      <div class="user-email">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" class="role-select" [disabled]="isCurrentUser(u)">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td>
                  <button (click)="toggleUserStatus(u)" class="btn-status-toggle"
                          [class.status-active]="u.is_active" [class.status-inactive]="!u.is_active"
                          [disabled]="isCurrentUser(u)" title="Click to toggle status">
                    {{ u.is_active ? 'Active' : 'Deactivated' }}
                  </button>
                </td>
                <td>
                  <span class="pill" [class.pill-green]="u.email_verified" [class.pill-amber]="!u.email_verified">
                    {{ u.email_verified ? 'Verified' : 'Pending' }}
                  </span>
                </td>
                <td>
                  <span class="provider-tag" [class.provider-google]="u.oauth_provider === 'google'">
                    {{ u.oauth_provider === 'google' ? 'Google OAuth' : 'Password' }}
                  </span>
                </td>
                <td>
                  <span class="count-pill">{{ u.display_count || 0 }} Displays</span>
                  <span class="count-pill widget-count-pill">{{ u.widget_count || 0 }} Widgets</span>
                </td>
                <td class="date-cell">{{ formatDate(u.created_at) }}</td>
                <td class="date-cell">{{ u.last_login_at ? formatDate(u.last_login_at) : 'Never' }}</td>
                <td>
                  <div class="row-actions">
                    <button (click)="inspectUserDisplays(u)" class="btn-action-icon" title="Inspect User Displays">
                      🔍
                    </button>
                    <button *ngIf="!isCurrentUser(u)" (click)="deleteUser(u)" class="btn-action-icon btn-delete" title="Delete User">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers.length === 0">
                <td colspan="9" class="empty-cell">No users found matching your search.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TAB 2: AUDIT ACTIVITY STREAM -->
        <div *ngIf="activeTab === 'activities'" class="activity-feed-container">
          <div class="activity-list">
            <div *ngFor="let log of activities" class="activity-card">
              <div class="activity-main">
                <span class="action-pill" [ngClass]="getActionClass(log.action)">
                  {{ log.action }}
                </span>
                <span class="activity-user">{{ log.user_email || 'System / Anonymous' }}</span>
                <span class="activity-ip">IP: {{ log.ip_address || '127.0.0.1' }}</span>
                <span class="activity-time">{{ formatDate(log.created_at) }}</span>
              </div>
              <div *ngIf="log.details" class="activity-details">
                <code>{{ log.details | json }}</code>
              </div>
            </div>
            <div *ngIf="activities.length === 0" class="empty-state">
              No recent audit activity logs recorded yet.
            </div>
          </div>
        </div>
      </main>

      <!-- INSPECT USER DISPLAYS MODAL -->
      <div *ngIf="selectedUserForInspect" class="modal-overlay" (click)="selectedUserForInspect = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🖥️ Displays for {{ selectedUserForInspect.name }} ({{ inspectDisplays.length }})</h3>
            <button (click)="selectedUserForInspect = null" class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div *ngFor="let disp of inspectDisplays" class="inspect-display-card">
              <div class="inspect-title">{{ disp.name }}</div>
              <div class="inspect-meta">
                <span>Token: <code>{{ disp.token }}</code></span>
                <span>Theme: {{ disp.theme }}</span>
                <span>Widgets: {{ disp.widget_count }}</span>
              </div>
              <div class="inspect-actions">
                <a [href]="'#/display/' + disp.token" target="_blank" class="btn btn-sm btn-primary">
                  Launch Kiosk ↗
                </a>
                <a [href]="'#/admin/editor/' + disp.token" class="btn btn-sm btn-secondary">
                  Open Editor ✎
                </a>
              </div>
            </div>
            <div *ngIf="inspectDisplays.length === 0" class="empty-state">
              This user has no created displays yet.
            </div>
          </div>
        </div>
      </div>

      <!-- CHANGE PASSWORD MODAL -->
      <div *ngIf="showPasswordModal" class="modal-overlay" (click)="closePasswordModal()">
        <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 440px;">
          <div class="modal-header">
            <h3>🔐 Change Super Admin Password</h3>
            <button (click)="closePasswordModal()" class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div *ngIf="passwordSuccess" class="alert alert-success" style="margin-bottom: 12px;">
              ✅ {{ passwordSuccess }}
            </div>
            <div *ngIf="passwordError" class="alert alert-error" style="margin-bottom: 12px;">
              ⚠️ {{ passwordError }}
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
              <label style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Current Password</label>
              <input 
                type="password" 
                [(ngModel)]="currentPassword" 
                placeholder="••••••••" 
                class="input-control" 
                autocomplete="current-password"
                style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 0.88rem;"
              />
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
              <label style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">New Password</label>
              <input 
                type="password" 
                [(ngModel)]="newPassword" 
                placeholder="At least 6 characters" 
                class="input-control" 
                autocomplete="new-password"
                style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 0.88rem;"
              />
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
              <label style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Confirm New Password</label>
              <input 
                type="password" 
                [(ngModel)]="confirmPassword" 
                placeholder="Re-enter new password" 
                class="input-control" 
                autocomplete="new-password"
                style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 0.88rem;"
              />
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-secondary" (click)="closePasswordModal()">Cancel</button>
              <button class="btn btn-primary" (click)="submitPasswordChange()" [disabled]="changingPassword">
                {{ changingPassword ? 'Updating...' : '🔑 Update Password' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .superadmin-layout {
      min-height: 100vh;
      background: #090d16;
      color: #f1f5f9;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }
    .superadmin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 32px;
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .btn-back {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-back:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .crown-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.2));
      border: 1px solid rgba(234, 179, 8, 0.4);
      padding: 6px 12px;
      border-radius: 12px;
    }
    .brand-title {
      font-size: 1.4rem;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #fef08a, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 2px 0 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .super-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.4);
      color: #fde047;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      background: #eab308;
      border-radius: 50%;
      box-shadow: 0 0 10px #eab308;
    }
    .superadmin-content {
      padding: 28px 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Alerts */
    .alert {
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .alert-success {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #86efac;
    }
    .alert-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      cursor: pointer;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      backdrop-filter: blur(12px);
    }
    .quota-card {
      flex-direction: column;
      align-items: stretch;
      justify-content: space-between;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(14, 165, 233, 0.3);
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.1);
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-title {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #38bdf8;
    }
    .metric-badge {
      background: rgba(14, 165, 233, 0.2);
      border: 1px solid rgba(14, 165, 233, 0.4);
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .badge-full {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
      color: #f87171;
    }
    .progress-bar-bg {
      height: 8px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0 4px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #0ea5e9);
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .progress-amber {
      background: linear-gradient(90deg, #f59e0b, #eab308);
    }
    .progress-red {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }
    .quota-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .metric-icon {
      font-size: 1.6rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 12px;
    }
    .metric-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
    }
    .metric-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Tabs & Search */
    .tab-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .tab-segments {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 4px;
      gap: 4px;
    }
    .tab-segments button {
      padding: 10px 18px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.88rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-segments button.active {
      background: #0ea5e9;
      color: #fff;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }
    .search-input {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.88rem;
      width: 280px;
      outline: none;
    }
    .search-input:focus {
      border-color: #0ea5e9;
    }

    /* Table */
    .table-container {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    .data-table th {
      background: rgba(15, 23, 42, 0.9);
      padding: 14px 18px;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.72rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .data-table td {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
    }
    .user-name {
      font-weight: 700;
      color: #fff;
    }
    .user-email {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .role-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.8rem;
    }
    .btn-status-toggle {
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid transparent;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }
    .status-active {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }
    .status-inactive {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .pill {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .pill-green {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .pill-amber {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .provider-tag {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .provider-google {
      color: #38bdf8;
      font-weight: 700;
    }
    .count-pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      margin-right: 4px;
    }
    .widget-count-pill {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
    }
    .date-cell {
      color: #94a3b8;
      font-size: 0.78rem;
    }
    .row-actions {
      display: flex;
      gap: 8px;
    }
    .btn-action-icon {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn-action-icon:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: #ef4444;
    }
    .empty-cell {
      text-align: center;
      padding: 36px;
      color: #64748b;
    }

    /* Activity Feed */
    .activity-feed-container {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
    }
    .activity-card {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .activity-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .action-pill {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .action-auth {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .action-warn {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .action-err {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .action-admin {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }
    .activity-user {
      font-weight: 700;
      color: #f1f5f9;
      font-size: 0.85rem;
    }
    .activity-ip {
      font-size: 0.75rem;
      color: #64748b;
    }
    .activity-time {
      margin-left: auto;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .activity-details code {
      font-size: 0.72rem;
      color: #38bdf8;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 8px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
    }
    .modal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.4rem;
      cursor: pointer;
    }
    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .inspect-display-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .inspect-title {
      font-weight: 700;
      margin-bottom: 4px;
    }
    .inspect-meta {
      font-size: 0.75rem;
      color: #94a3b8;
      display: flex;
      gap: 12px;
    }
    .inspect-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.78rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .btn-primary {
      background: #0ea5e9;
      color: #fff;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    .empty-state {
      text-align: center;
      padding: 30px;
      color: #64748b;
    }
  `]
})
export class SuperAdminComponent implements OnInit {
  stats: SuperAdminStats | null = null;
  users: User[] = [];
  filteredUsers: User[] = [];
  activities: UserActivityLog[] = [];
  activeTab: 'users' | 'activities' = 'users';
  searchQuery: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  selectedUserForInspect: User | null = null;
  inspectDisplays: any[] = [];

  constructor(
    private superAdminService: SuperAdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.superAdminService.getStats().subscribe({
      next: (res) => {
        if (res.success) this.stats = res.stats;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to load stats';
      }
    });

    this.superAdminService.getUsers().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.users = res.users;
          this.filterUsers();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to load users';
      }
    });

    if (this.activeTab === 'activities') {
      this.loadActivities();
    }
  }

  loadActivities(): void {
    this.superAdminService.getActivities(80).subscribe({
      next: (res) => {
        if (res.success) this.activities = res.activities;
      }
    });
  }

  filterUsers(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    }
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.is_active;
    this.superAdminService.toggleUserStatus(user.id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          user.is_active = newStatus;
          this.successMessage = res.message;
          setTimeout(() => this.successMessage = '', 3500);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update user status';
      }
    });
  }

  changeRole(user: User, newRole: 'user' | 'admin' | 'superadmin'): void {
    if (user.role === newRole) return;
    this.superAdminService.updateUserRole(user.id, newRole).subscribe({
      next: (res) => {
        if (res.success) {
          user.role = newRole;
          this.successMessage = res.message;
          setTimeout(() => this.successMessage = '', 3500);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to update user role';
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to completely delete user ${user.name} (${user.email}) and all their displays? This cannot be undone.`)) {
      return;
    }

    this.superAdminService.deleteUser(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.users = this.users.filter(u => u.id !== user.id);
          this.filterUsers();
          this.successMessage = res.message;
          setTimeout(() => this.successMessage = '', 3500);
          this.refreshAll();
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to delete user';
      }
    });
  }

  inspectUserDisplays(user: User): void {
    this.selectedUserForInspect = user;
    this.inspectDisplays = [];
    this.superAdminService.getUserDisplays(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.inspectDisplays = res.displays || [];
        }
      }
    });
  }

  isCurrentUser(user: User): boolean {
    const current = (this.authService as any).currentUserSubject.value;
    return current && current.id === user.id;
  }

  getActionClass(action: string): string {
    if (action.includes('REGISTER') || action.includes('VERIFIED') || action.includes('SUCCESS')) return 'action-auth';
    if (action.includes('TOGGLE') || action.includes('ROLE') || action.includes('DELETED')) return 'action-admin';
    if (action.includes('BLOCKED') || action.includes('FAILED')) return 'action-err';
    return 'action-warn';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Password Change Modal
  showPasswordModal: boolean = false;
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  changingPassword: boolean = false;
  passwordSuccess: string = '';
  passwordError: string = '';

  openPasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordSuccess = '';
    this.passwordError = '';
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  submitPasswordChange(): void {
    this.passwordSuccess = '';
    this.passwordError = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'All password fields are required';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New passwords do not match';
      return;
    }
    if (this.currentPassword === this.newPassword) {
      this.passwordError = 'New password must be different from current password';
      return;
    }

    this.changingPassword = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.changingPassword = false;
        if (res.success) {
          this.passwordSuccess = res.message || 'Password changed successfully!';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          setTimeout(() => {
            this.closePasswordModal();
            this.successMessage = '✅ Password updated successfully!';
          }, 1500);
        } else {
          this.passwordError = res.error || 'Failed to change password';
        }
      },
      error: (err) => {
        this.changingPassword = false;
        this.passwordError = err.error?.error || 'Failed to change password. Please check your current password.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/displays']);
  }
}
