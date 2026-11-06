import { Component } from '@angular/core';
import { ConfigField } from '../../widgets/widget-config-schema';
import { WidgetFormBase } from './widget-form-base';

const DISPLAY_FIELDS: readonly ConfigField[] = [
  { type: 'number', key: 'intervalSeconds', label: 'Slide Interval (s)', min: 3, row: 'slides' },
  { type: 'select', key: 'fitMode', label: 'Image Fit', row: 'slides', options: [
    { value: 'cover', label: 'Cover (Fill Frame)' },
    { value: 'contain', label: 'Contain (Fit Whole Photo)' },
  ] },
  { type: 'toggle', key: 'blurBackground', label: 'Blur Backdrop when Contained' },
  { type: 'toggle', key: 'kenBurns', label: 'Cinematic Ken Burns Pan & Zoom' },
];

@Component({
  selector: 'app-photo-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Google Photos or Apple iCloud Shared Album URL</label>
        <input type="text" [(ngModel)]="config['albumUrl']" class="input-control"
               placeholder="https://photos.app.goo.gl/... or https://www.icloud.com/sharedalbum/#..." />
        <span class="field-hint">Paste any Google Photos or Apple iCloud public shared album link to automatically stream photos.</span>
      </div>
      <div class="form-group">
        <label>Or Custom Image URLs (one per line)</label>
        <textarea [ngModel]="imagesText" (ngModelChange)="setImages($event)" rows="3" class="input-control" placeholder="https://images.unsplash.com/..."></textarea>
      </div>
    </div>
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
  `,
  styleUrls: ['./widget-forms.css']
})
export class PhotoFormComponent extends WidgetFormBase {
  readonly fields = DISPLAY_FIELDS;

  get imagesText(): string {
    const images = this.config['images'];
    if (!images) return '';
    return Array.isArray(images) ? images.join('\n') : String(images);
  }

  setImages(text: string): void {
    this.config['images'] = text.split('\n').map(l => l.trim()).filter(l => !!l);
  }
}
