import { Component } from '@angular/core';
import { ConfigField } from '../../widgets/widget-config-schema';
import { TEXT_PLACEHOLDERS } from '../../../utils/text-template.util';
import { WidgetFormBase } from './widget-form-base';

const LAYOUT_FIELDS: readonly ConfigField[] = [
  { type: 'select', key: 'fontSize', label: 'Font Size', options: [
    { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' },
  ] },
  { type: 'select', key: 'textAlign', label: 'Text Alignment', options: [
    { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
  ] },
];

@Component({
  selector: 'app-text-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Title</label>
        <input type="text" [(ngModel)]="config['title']" class="input-control" />
      </div>
      <div class="form-group">
        <label>Body Text (Supports Line Breaks)</label>
        <textarea [(ngModel)]="config['body']" rows="4" class="input-control"></textarea>
        <p class="field-hint">Live placeholders — click to insert:</p>
        <div class="placeholder-chips">
          <button type="button" *ngFor="let p of placeholders" class="placeholder-chip" (click)="insert(p.token)" [title]="'Shows e.g. ' + p.example">{{ p.token }}</button>
        </div>
      </div>
    </div>
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
  `,
  styleUrls: ['./widget-forms.css']
})
export class TextFormComponent extends WidgetFormBase {
  readonly fields = LAYOUT_FIELDS;
  readonly placeholders = TEXT_PLACEHOLDERS;

  insert(token: string): void {
    const body = String(this.config['body'] || '');
    this.config['body'] = body + (body && !/\s$/.test(body) ? ' ' : '') + token;
  }
}
