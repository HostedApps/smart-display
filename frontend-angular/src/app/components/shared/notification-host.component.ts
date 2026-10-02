import { Component, HostListener } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-host',
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      <div *ngFor="let t of (notifications.toasts$ | async); trackBy: trackById"
           class="toast" [ngClass]="t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
        <span class="toast-msg">{{ t.message }}</span>
        <button type="button" class="toast-close" (click)="notifications.dismiss(t.id)" aria-label="Dismiss notification">×</button>
      </div>
    </div>

    <div *ngIf="notifications.confirm$ | async as req" class="confirm-backdrop" (click)="req.resolve(false)">
      <div class="confirm-dialog" role="alertdialog" aria-modal="true"
           aria-labelledby="sd-confirm-title" aria-describedby="sd-confirm-msg"
           (click)="$event.stopPropagation()">
        <h3 id="sd-confirm-title">{{ req.title }}</h3>
        <p id="sd-confirm-msg">{{ req.message }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel" (click)="req.resolve(false)">Cancel</button>
          <button type="button" class="btn-confirm" [class.danger]="req.danger" (click)="req.resolve(true)">{{ req.confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(420px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 4px solid #38bdf8;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      font-size: 0.9rem;
      line-height: 1.4;
      animation: toast-in 0.2s ease-out;
    }
    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast-msg { flex: 1; word-break: break-word; }
    .toast-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;
    }
    .toast-close:hover, .toast-close:focus-visible { color: #f1f5f9; }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }

    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: rgba(2, 6, 23, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .confirm-dialog {
      width: 100%;
      max-width: 440px;
      background: #0f172a;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .confirm-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; }
    .confirm-dialog p { margin: 0 0 20px; color: #cbd5e1; line-height: 1.5; font-size: 0.92rem; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .confirm-actions button {
      border-radius: 8px;
      padding: 9px 16px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-cancel { background: transparent; color: #cbd5e1; border-color: rgba(255, 255, 255, 0.15); }
    .btn-confirm { background: #0ea5e9; color: #fff; }
    .btn-confirm.danger { background: #dc2626; }
    .confirm-actions button:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
  `]
})
export class NotificationHostComponent {
  constructor(public notifications: NotificationService) {}

  trackById(_: number, t: { id: number }): number {
    return t.id;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.notifications.confirm$.value?.resolve(false);
  }
}
