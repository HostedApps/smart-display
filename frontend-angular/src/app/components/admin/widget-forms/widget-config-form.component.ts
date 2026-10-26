import { Component, Input, OnChanges } from '@angular/core';
import { ConfigField, InputField, PresetField, WidgetConfig } from '../../widgets/widget-config-schema';

interface Block {
  section?: string;
  rows: ConfigField[][];
}

/**
 * Renders a widget's settings form from its schema (WidgetDefinition.fields in widget-registry.ts),
 * editing the widget's config object in place, as the hand-written forms did.
 */
@Component({
  selector: 'app-widget-config-form',
  template: `
    <div class="widget-form">
      <ng-container *ngFor="let block of blocks">
        <ng-container *ngIf="!block.section">
          <ng-container *ngTemplateOutlet="rowsTpl; context: { $implicit: block.rows }"></ng-container>
        </ng-container>
        <details *ngIf="block.section && anyVisible(block)" class="form-section">
          <summary>{{ block.section }}</summary>
          <ng-container *ngTemplateOutlet="rowsTpl; context: { $implicit: block.rows }"></ng-container>
        </details>
      </ng-container>
    </div>

    <ng-template #rowsTpl let-rows>
      <ng-container *ngFor="let row of rows">
        <div *ngIf="row.length > 1 && rowVisible(row); else single" class="form-row">
          <ng-container *ngFor="let f of row">
            <ng-container *ngIf="visible(f)"><ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: f }"></ng-container></ng-container>
          </ng-container>
        </div>
        <ng-template #single>
          <ng-container *ngFor="let f of row">
            <ng-container *ngIf="visible(f)"><ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: f }"></ng-container></ng-container>
          </ng-container>
        </ng-template>
      </ng-container>
    </ng-template>

    <ng-template #fieldTpl let-f>
      <ng-container [ngSwitch]="f.type">
        <div *ngSwitchCase="'notice'" class="form-notice">
          <span *ngIf="f.icon" class="form-notice-icon">{{ f.icon }}</span>
          <span class="form-notice-text"><strong *ngIf="f.title">{{ f.title }} </strong>{{ f.text }}</span>
        </div>

        <div *ngSwitchCase="'webhook'" class="form-group">
          <span class="section-subhead"><label>{{ f.title }}</label></span>
          <p class="tab-desc">{{ f.text }}</p>
          <code class="webhook-snippet">POST /api/push_widget.php<br>{{ webhookBody() }}</code>
        </div>

        <div *ngSwitchCase="'preset'" class="form-group">
          <label>{{ f.label }}</label>
          <select class="input-control" (change)="applyPreset(f, $any($event.target).value); $any($event.target).value = ''">
            <option value="">{{ f.placeholder }}</option>
            <option *ngFor="let p of f.presets; let i = index" [value]="i">{{ p.label }}</option>
          </select>
        </div>

        <div *ngSwitchCase="'toggle'" class="form-group checkbox-group">
          <label>
            <input *ngIf="f.defaultOn" type="checkbox" [ngModel]="config[f.key] !== false" (ngModelChange)="config[f.key] = $event" />
            <input *ngIf="!f.defaultOn" type="checkbox" [(ngModel)]="config[f.key]" />
            {{ f.label }}
          </label>
        </div>

        <div *ngSwitchDefault class="form-group">
          <label *ngIf="f.type !== 'range'">{{ f.label }}</label>
          <label *ngIf="f.type === 'range'">{{ f.label }}: {{ config[f.key] ?? f.defaultValue }}{{ f.unit || '' }}</label>

          <ng-container [ngSwitch]="f.type">
            <select *ngSwitchCase="'select'" [(ngModel)]="config[f.key]" class="input-control">
              <option *ngFor="let o of f.options" [ngValue]="o.value">{{ o.label }}</option>
            </select>
            <textarea *ngSwitchCase="'textarea'" [(ngModel)]="config[f.key]" [rows]="f.rows || 3" [placeholder]="placeholder(f)"
                      class="input-control" [class.input-code]="f.code" [attr.spellcheck]="f.code ? 'false' : null"></textarea>
            <app-secret-input *ngSwitchCase="'secret'" [config]="config" [field]="f.key" [placeholder]="placeholder(f)"></app-secret-input>
            <input *ngSwitchCase="'number'" type="number" [(ngModel)]="config[f.key]" [attr.min]="f.min ?? null" [attr.max]="f.max ?? null"
                   [attr.step]="f.step ?? null" [placeholder]="placeholder(f)" class="input-control" />
            <input *ngSwitchCase="'range'" type="range" [(ngModel)]="config[f.key]" [attr.min]="f.min ?? null" [attr.max]="f.max ?? null"
                   [attr.step]="f.step ?? 1" class="slider-control" />
            <input *ngSwitchCase="'color'" type="color" [(ngModel)]="config[f.key]" class="input-control input-color" />
            <input *ngSwitchCase="'date'" type="date" [(ngModel)]="config[f.key]" class="input-control" />
            <input *ngSwitchCase="'time'" type="time" [(ngModel)]="config[f.key]" class="input-control" />
            <input *ngSwitchCase="'list'" type="text" [ngModel]="listText(f)" (ngModelChange)="setList(f, $event)" [placeholder]="placeholder(f)" class="input-control" />
            <div *ngSwitchDefault [class.input-prefix]="!!f.prefix">
              <span *ngIf="f.prefix">{{ f.prefix }}</span>
              <input type="text" [(ngModel)]="config[f.key]" [placeholder]="placeholder(f)" class="input-control" />
            </div>
          </ng-container>

          <span *ngIf="f.hint" class="field-hint">{{ f.hint }}</span>
        </div>
      </ng-container>
    </ng-template>
  `,
  styleUrls: ['./widget-forms.css']
})
export class WidgetConfigFormComponent implements OnChanges {
  @Input({ required: true }) config!: WidgetConfig;
  @Input({ required: true }) fields!: readonly ConfigField[];
  /** For webhook instructions */
  @Input() displayToken = '';
  @Input() widgetId: number | null = null;

  blocks: Block[] = [];

  ngOnChanges(): void {
    // Consecutive fields: same `section` → one collapsible block; same `row` → one form row
    const blocks: Block[] = [];
    for (const f of this.fields || []) {
      let block = blocks[blocks.length - 1];
      if (!block || block.section !== f.section) {
        block = { section: f.section, rows: [] };
        blocks.push(block);
      }
      const lastRow = block.rows[block.rows.length - 1];
      if (f.row && lastRow && lastRow[0].row === f.row) {
        lastRow.push(f);
      } else {
        block.rows.push([f]);
      }
    }
    this.blocks = blocks;
  }

  visible(f: ConfigField): boolean {
    return !f.showIf || f.showIf(this.config);
  }

  rowVisible(row: ConfigField[]): boolean {
    return row.some(f => this.visible(f));
  }

  anyVisible(block: Block): boolean {
    return block.rows.some(r => this.rowVisible(r));
  }

  placeholder(f: InputField): string {
    return typeof f.placeholder === 'function' ? f.placeholder(this.config) : (f.placeholder || '');
  }

  listText(f: InputField): string {
    const v = this.config[f.key];
    return Array.isArray(v) ? v.join(f.separator ?? ',') : (v ?? '');
  }

  setList(f: InputField, text: string): void {
    this.config[f.key] = String(text).split(f.separator ?? ',');
  }

  applyPreset(f: PresetField, index: string): void {
    const preset = f.presets[Number(index)];
    if (preset) Object.assign(this.config, preset.values);
  }

  webhookBody(): string {
    return `{ "token": "${this.displayToken}", "widget_id": ${this.widgetId}, "value": 78.5 }`;
  }
}
