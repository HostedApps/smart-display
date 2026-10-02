import { Component, Input } from '@angular/core';

/** Shared empty / error state shown inside a widget card when there is no real data to show. */
@Component({
  selector: 'app-widget-state',
  template: `
    <div class="widget-state" [class.error]="kind === 'error'" [attr.role]="kind === 'error' ? 'alert' : 'status'">
      <span class="state-icon" aria-hidden="true">{{ icon || (kind === 'error' ? '⚠️' : '🔌') }}</span>
      <span class="state-message">{{ message }}</span>
      <span class="state-hint" *ngIf="hint">{{ hint }}</span>
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; }
    .widget-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px;
      text-align: center;
      color: #94a3b8;
    }
    .state-icon { font-size: 1.6rem; opacity: 0.85; }
    .state-message { font-size: 0.95rem; font-weight: 600; color: #cbd5e1; }
    .state-hint { font-size: 0.78rem; max-width: 32ch; line-height: 1.4; }
    .widget-state.error .state-message { color: #fca5a5; }
  `]
})
export class WidgetStateComponent {
  @Input() kind: 'empty' | 'error' = 'empty';
  @Input() icon = '';
  @Input() message = '';
  @Input() hint = '';
}

/** Small "Sample data" pill for widgets that are still showing built-in example content. */
@Component({
  selector: 'app-sample-badge',
  template: `<span class="sample-badge" title="This widget is showing example content. Configure it in the editor to show your own data.">Sample data</span>`,
  styles: [`
    :host { position: absolute; top: 10px; right: 10px; z-index: 5; pointer-events: auto; }
    .sample-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(250, 204, 21, 0.18);
      border: 1px solid rgba(250, 204, 21, 0.45);
      color: #fde68a;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `]
})
export class SampleBadgeComponent {}
