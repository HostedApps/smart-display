import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (confirmed: boolean) => void;
}

/**
 * In-app replacement for window.alert() / window.confirm().
 * Rendered by <app-notification-host>, which lives in the root component.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly confirm$ = new BehaviorSubject<ConfirmRequest | null>(null);
  private nextId = 1;

  success(message: string): void { this.show('success', message); }
  error(message: string): void { this.show('error', message, 7000); }
  info(message: string): void { this.show('info', message); }

  show(kind: ToastKind, message: string, durationMs = 4000): void {
    const toast: Toast = { id: this.nextId++, kind, message };
    this.toasts$.next([...this.toasts$.value, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  dismiss(id: number): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }

  /** Resolves true when the user confirms, false on cancel / Escape / backdrop click. */
  confirm(message: string, options: { title?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    this.confirm$.value?.resolve(false);
    return new Promise<boolean>(resolve => {
      this.confirm$.next({
        title: options.title || 'Are you sure?',
        message,
        confirmLabel: options.confirmLabel || 'Confirm',
        danger: options.danger ?? false,
        resolve: (confirmed: boolean) => {
          this.confirm$.next(null);
          resolve(confirmed);
        }
      });
    });
  }
}
