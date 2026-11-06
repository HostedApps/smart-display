import { Component } from '@angular/core';
import { WidgetFormBase } from './widget-form-base';

@Component({
  selector: 'app-homeassistant-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Widget Title</label>
        <input type="text" [(ngModel)]="config['title']" placeholder="Smart Home" class="input-control" />
      </div>
      <div class="form-group">
        <label>Home Assistant URL (Optional)</label>
        <input type="text" [(ngModel)]="config['haUrl']" placeholder="http://homeassistant.local:8123 or Nabu Casa" class="input-control" />
      </div>
      <div class="form-group">
        <label>Long-Lived Access Token (Optional)</label>
        <app-secret-input [config]="config" field="token" placeholder="Long-lived access token"></app-secret-input>
        <span class="field-hint">Leave blank to use interactive simulated smart tiles.</span>
      </div>

      <div class="smart-home-guide-box">
        <strong>🔌 Google Home & Alexa Integration:</strong>
        <p>Connect Google Home & Alexa through Home Assistant (Matter / Cloud) or customize the smart tiles directly below:</p>
      </div>

      <div class="section-subhead">
        <label>Smart Entities</label>
        <button type="button" (click)="addEntity()" class="btn-xs-action">+ Add Entity</button>
      </div>
      <div *ngFor="let ent of (config['entities'] || []); let i = index" class="note-config-item">
        <div class="note-config-top">
          <input type="text" [(ngModel)]="ent.icon" placeholder="💡" style="width:36px; text-align:center;" class="input-control" aria-label="Icon" />
          <input type="text" [(ngModel)]="ent.label" placeholder="Entity Label (e.g. Living Room)" class="input-control" />
          <button type="button" (click)="removeEntity(i)" class="btn-icon-danger" aria-label="Remove"><app-icon name="x" [size]="14"></app-icon></button>
        </div>
        <div class="form-row" style="margin-top:4px;">
          <input type="text" [(ngModel)]="ent.entityId" placeholder="light.living_room" class="input-control" />
          <input type="text" [(ngModel)]="ent.state" placeholder="on / 72°F" class="input-control" style="max-width:80px;" />
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class HomeAssistantFormComponent extends WidgetFormBase {
  addEntity(): void {
    (this.config['entities'] ||= []).push({ entityId: 'light.new_device', label: 'New Smart Device', state: 'on', icon: '💡' });
    this.changed();
  }

  removeEntity(i: number): void {
    this.config['entities']?.splice(i, 1);
    this.changed();
  }
}
