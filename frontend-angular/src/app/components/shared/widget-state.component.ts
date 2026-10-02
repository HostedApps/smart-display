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
      color: var(--sd-text-muted);
    }
    .state-icon { font-size: 1.6rem; opacity: 0.85; }
    .state-message { font-size: var(--sd-fs-title); font-weight: 600; color: var(--sd-text); }
    .state-hint { font-size: var(--sd-fs-sm); max-width: 32ch; line-height: 1.4; }
    .widget-state.error .state-message { color: var(--sd-danger); }
    /* Short widgets (e.g. ticker strips): keep just the one-line message */
    @container (max-height: 170px) {
      .widget-state { gap: 2px; padding: 4px; }
      .state-icon, .state-hint { display: none; }
    }
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
      background: var(--sd-warning-soft);
      border: 1px solid var(--sd-warning);
      color: var(--sd-text);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `]
})
export class SampleBadgeComponent {}
