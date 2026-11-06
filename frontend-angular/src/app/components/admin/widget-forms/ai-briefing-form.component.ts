import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigField } from '../../widgets/widget-config-schema';
import { AIProvider } from '../../../models/display.model';
import { AI_PROVIDER_KEY_FIELDS, AI_PROVIDER_NAMES } from '../../widgets/ai-briefing-widget.component';
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

const provider = (c: Record<string, any>): AIProvider => c['provider'] || 'gemini';

/** Provider choice and its connection settings (keys are secrets: stored on the server only) */
const PROVIDER_FIELDS: readonly ConfigField[] = [
  { type: 'select', key: 'provider', label: 'AI Provider', options: [
    { value: undefined, label: 'Google Gemini' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'vllm', label: 'Self-hosted (vLLM or OpenAI-compatible)' },
  ] },
  { type: 'text', key: 'vllmUrl', label: 'Server URL', placeholder: 'https://llm.example.com/v1',
    hint: 'An OpenAI-compatible endpoint the Smart Display server can reach over the internet (e.g. vLLM behind a tunnel). Private network addresses are refused unless the server sets ALLOW_PRIVATE_LLM_URLS=1.',
    showIf: c => provider(c) === 'vllm' },
  { type: 'secret', key: 'apiKey', label: 'Google Gemini API Key (Optional)', placeholder: 'Leave blank to use the built-in engine', showIf: c => provider(c) === 'gemini' },
  { type: 'secret', key: 'anthropicKey', label: 'Anthropic API Key', placeholder: 'sk-ant-...', showIf: c => provider(c) === 'anthropic' },
  { type: 'secret', key: 'openaiKey', label: 'OpenAI API Key', placeholder: 'sk-...', showIf: c => provider(c) === 'openai' },
  { type: 'secret', key: 'vllmKey', label: 'API Key (Optional)', placeholder: 'Only if your server requires one', showIf: c => provider(c) === 'vllm' },
  { type: 'text', key: 'model', label: 'Model (Optional)', placeholder: c => MODEL_PLACEHOLDERS[provider(c)] },
];

const MODEL_PLACEHOLDERS: Record<AIProvider, string> = {
  gemini: 'Detected automatically for your key',
  anthropic: 'claude-haiku-5-5 (default)',
  openai: 'gpt-5-mini (default)',
  vllm: 'Detected from the server (first served model)',
};

@Component({
  selector: 'app-ai-briefing-form',
  template: `
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
    <app-widget-config-form [config]="config" [fields]="providerFields"></app-widget-config-form>
    <div class="widget-form">
      <div class="form-group">
        <button type="button" (click)="testConnection()" [disabled]="testing" class="form-action-btn" style="padding: 8px 12px; align-self: flex-start;">
          {{ testing ? 'Testing...' : 'Test connection' }}
        </button>
        <div *ngIf="result" [style.color]="result.success ? '#34d399' : '#f87171'" style="font-size: 0.72rem; margin-top: 5px; font-weight: 600; word-break: break-word;">
          {{ result.success ? '✅ ' : '❌ ' }}{{ result.message }}
        </div>
        <span class="field-hint">Without a provider key, the built-in engine writes the briefing from the same facts.</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class AiBriefingFormComponent extends WidgetFormBase {
  readonly fields = FIELDS;
  readonly providerFields = PROVIDER_FIELDS;
  testing = false;
  result: { success: boolean; message: string } | null = null;

  constructor(private http: HttpClient) {
    super();
  }

  testConnection(): void {
    const p = provider(this.config);
    const keyField = AI_PROVIDER_KEY_FIELDS[p];
    const typedKey = String(this.config[keyField] || '').trim();
    const savedKey = !typedKey && this.config['_secretsSet']?.includes(keyField) && this.config['_widgetId'];
    if (p === 'vllm' ? !String(this.config['vllmUrl'] || '').trim() : !typedKey && !savedKey) {
      this.result = { success: false, message: p === 'vllm' ? 'Please enter the server URL first.' : `Please enter a ${AI_PROVIDER_NAMES[p]} API key first.` };
      return;
    }
    this.testing = true;
    this.result = null;
    this.http.post<any>(`${environment.apiUrl}/ai_briefing.php`, {
      provider: p,
      model: this.config['model'] || '',
      vllmUrl: this.config['vllmUrl'] || '',
      // Without a typed key the server tests the saved one, looked up by widget id; it's never sent back to the editor
      apiKey: typedKey,
      widgetId: this.config['_widgetId'] || 0,
      test: true
    }).subscribe({
      next: (res) => {
        this.testing = false;
        this.result = res?.success
          ? { success: true, message: res.message || `Connected to ${AI_PROVIDER_NAMES[p]}.` }
          : { success: false, message: res?.error || 'Validation failed. Check your settings.' };
      },
      error: (err) => {
        this.testing = false;
        this.result = { success: false, message: err?.error?.error || err?.message || 'Server network error.' };
      }
    });
  }
}
