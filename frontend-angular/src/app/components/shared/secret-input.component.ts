import { Component, Input } from '@angular/core';
import { WidgetSecretMeta } from '../../models/display.model';

/**
 * Editor input for a widget secret (API key, token, auth header). Saved secrets live encrypted on
 * the server and are never sent back to the editor, so this shows "Saved" with Replace / Remove
 * instead of the value. Typing a value sends it on the next save; Remove marks it for deletion.
 */
@Component({
  selector: 'app-secret-input',
  template: `
    <div class="secret-saved" *ngIf="isSaved && !replacing; else entry">
      <span class="secret-status"><app-icon name="lock" [size]="13"></app-icon> Saved on the server</span>
      <button type="button" class="secret-btn" (click)="replacing = true">Replace</button>
      <button type="button" class="secret-btn secret-remove" (click)="remove()">Remove</button>
    </div>
    <ng-template #entry>
      <div class="secret-entry">
        <input type="password" autocomplete="off" class="input-control"
               [(ngModel)]="config[field]" [placeholder]="placeholder" />
        <button *ngIf="isSaved" type="button" class="secret-btn" (click)="cancel()">Cancel</button>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .secret-saved, .secret-entry { display: flex; align-items: center; gap: 8px; }
    .secret-entry .input-control { flex: 1; }
    .secret-status { flex: 1; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--sd-success, #34d399); }
    .secret-btn { padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.35); background: transparent; color: inherit; cursor: pointer; }
    .secret-remove { color: var(--sd-danger, #f87171); }
  `]
})
export class SecretInputComponent {
  @Input({ required: true }) config!: WidgetSecretMeta & Record<string, any>;
  @Input({ required: true }) field!: string;
  @Input() placeholder = '';

  replacing = false;

  get isSaved(): boolean {
    return !!this.config._secretsSet?.includes(this.field);
  }

  remove(): void {
    this.config._secretsSet = (this.config._secretsSet || []).filter(f => f !== this.field);
    this.config._clearSecrets = [...(this.config._clearSecrets || []).filter(f => f !== this.field), this.field];
    this.config[this.field] = '';
    this.replacing = false;
  }

  cancel(): void {
    this.config[this.field] = '';
    this.replacing = false;
  }
}
