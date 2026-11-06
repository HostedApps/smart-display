import { Component } from '@angular/core';
import { CUSTOM_WIDGET_EXAMPLES, findCustomWidgetExample, jsonSettingsError } from '../../../utils/custom-widget-examples';
import { NotificationService } from '../../../services/notification.service';
import { WidgetFormBase } from './widget-form-base';

@Component({
  selector: 'app-custom-widget-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Load example</label>
        <select (change)="loadExample($any($event.target).value); $any($event.target).value = ''" class="input-control">
          <option value="">Start from a template...</option>
          <option *ngFor="let ex of examples" [value]="ex.id">{{ ex.label }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>Source</label>
        <select [(ngModel)]="config['source']" class="input-control">
          <option value="html">Paste HTML code</option>
          <option value="url">Link to an https page</option>
        </select>
      </div>

      <div class="form-group" *ngIf="config['source'] !== 'url'">
        <label>HTML Code</label>
        <textarea [(ngModel)]="config['html']" rows="12" spellcheck="false" placeholder="<!doctype html>&#10;<html>...</html>" class="input-control input-code"></textarea>
        <span class="field-hint">Runs in a sandbox: no access to this app, cookies or storage.</span>
      </div>

      <div class="form-group" *ngIf="config['source'] === 'url'">
        <label>Widget URL</label>
        <input type="text" [(ngModel)]="config['url']" placeholder="https://example.com/my-widget.html" class="input-control" />
        <span class="field-hint">Must start with <code>https://</code></span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Title Header</label>
          <input type="text" [(ngModel)]="config['title']" placeholder="(none)" class="input-control" />
        </div>
        <div class="form-group">
          <label>Reload every (min)</label>
          <input type="number" min="0" max="1440" [(ngModel)]="config['refreshMinutes']" class="input-control" />
        </div>
      </div>

      <div class="form-group">
        <label>Settings (JSON)</label>
        <textarea [(ngModel)]="config['settings']" rows="4" spellcheck="false" placeholder='{"date": "2026-12-25", "label": "Christmas"}' class="input-control input-code"></textarea>
        <span class="field-hint" *ngIf="settingsError as err" style="color: var(--sd-warning, #f59e0b);">Invalid JSON, so it will be ignored: {{ err }}</span>
      </div>

      <div class="form-group checkbox-group">
        <label><input type="checkbox" [(ngModel)]="config['allowPopups']" /> Allow popups (links that open a new window)</label>
      </div>

      <span class="field-hint">
        Message protocol, theme tokens and examples:
        <a href="https://github.com/HostedApps/smart-display/blob/main/docs/WIDGET_SDK.md" target="_blank" rel="noopener noreferrer">docs/WIDGET_SDK.md</a>
      </span>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class CustomWidgetFormComponent extends WidgetFormBase {
  readonly examples = CUSTOM_WIDGET_EXAMPLES;

  constructor(private notifications: NotificationService) {
    super();
  }

  /** Parse error for the settings JSON, or '' when valid / empty */
  get settingsError(): string {
    return jsonSettingsError(this.config['settings']);
  }

  async loadExample(id: string): Promise<void> {
    const ex = findCustomWidgetExample(id);
    if (!ex) return;
    if (String(this.config['html'] || '').trim()) {
      const ok = await this.notifications.confirm('The current HTML will be replaced with this example.', { title: 'Load example?', confirmLabel: 'Replace' });
      if (!ok) return;
    }
    this.config['source'] = 'html';
    this.config['html'] = ex.html;
    this.config['settings'] = ex.settings;
    this.changed();
  }
}
