import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigField } from '../../widgets/widget-config-schema';
import { environment } from '../../../../environments/environment';
import { WidgetFormBase } from './widget-form-base';

const FIELDS: readonly ConfigField[] = [
  { type: 'text', key: 'userName', label: 'Your Name (for personalized greetings)', placeholder: 'e.g. Sam' },
  { type: 'select', key: 'tone', label: 'Assistant Tone', options: [
    { value: 'warm', label: 'Warm & Encouraging (Family)' },
    { value: 'executive', label: 'Executive & Concise (Office)' },
    { value: 'motivational', label: 'High-Energy & Motivational' },
    { value: 'concise', label: 'Short & Concise' },
  ] },
  { type: 'text', key: 'city', label: 'Location', placeholder: "e.g. Austin, TX — blank uses this screen's Weather widget",
    hint: 'The briefing mentions weather only from this location or a Weather widget on the same screen, and the next event from a Calendar widget. Nothing is made up.' },
  { type: 'select', key: 'units', label: 'Units', row: 'refresh', options: [
    { value: 'imperial', label: '°F' }, { value: 'metric', label: '°C' },
  ] },
  { type: 'select', key: 'refreshHours', label: 'Refresh every', row: 'refresh', options: [
    { value: 2, label: '2 hours' }, { value: 3, label: '3 hours' }, { value: 4, label: '4 hours' }, { value: 6, label: '6 hours' },
  ] },
];

@Component({
  selector: 'app-ai-briefing-form',
  template: `
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
    <div class="widget-form">
      <div class="form-group">
        <label>Google Gemini API Key (Optional)</label>
        <div style="display: flex; gap: 8px;">
          <app-secret-input [config]="config" field="apiKey" placeholder="Leave blank to use built-in ambient engine" style="flex: 1;"></app-secret-input>
          <button type="button" (click)="testKey()" [disabled]="testing" class="form-action-btn">
            {{ testing ? 'Testing...' : 'Test Key' }}
          </button>
        </div>
        <div *ngIf="result" [style.color]="result.success ? '#34d399' : '#f87171'" style="font-size: 0.72rem; margin-top: 5px; font-weight: 600; word-break: break-word;">
          {{ result.success ? '✅ ' : '❌ ' }}{{ result.message }}
        </div>
        <span class="field-hint">Default built-in intelligence engine works with zero setup.</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class AiBriefingFormComponent extends WidgetFormBase {
  readonly fields = FIELDS;
  testing = false;
  result: { success: boolean; message: string } | null = null;

  constructor(private http: HttpClient) {
    super();
  }

  testKey(): void {
    const typedKey = String(this.config['apiKey'] || '').trim();
    const savedKey = !typedKey && this.config['_secretsSet']?.includes('apiKey') && this.config['_widgetId'];
    if (!typedKey && !savedKey) {
      this.result = { success: false, message: 'Please enter a Gemini API key first.' };
      return;
    }
    this.testing = true;
    this.result = null;
    this.http.post<any>(`${environment.apiUrl}/ai_briefing.php`, {
      // A saved key is tested on the server by widget id; it's never sent back to the editor
      apiKey: typedKey,
      widgetId: savedKey ? this.config['_widgetId'] : 0,
      test: true
    }).subscribe({
      next: (res) => {
        this.testing = false;
        this.result = res?.success
          ? { success: true, message: res.message || 'Connected! Google Gemini is working.' }
          : { success: false, message: res?.error || 'Validation failed. Check your API key.' };
      },
      error: (err) => {
        this.testing = false;
        this.result = { success: false, message: err?.error?.error || err?.message || 'Server network error.' };
      }
    });
  }
}
