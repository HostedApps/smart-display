import { Component } from '@angular/core';
import { WidgetFormBase } from './widget-form-base';

@Component({
  selector: 'app-sticky-notes-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Board Title</label>
        <input type="text" [(ngModel)]="config['title']" placeholder="Family Notes" class="input-control" />
      </div>
      <div class="section-subhead">
        <label>Notes</label>
        <button type="button" (click)="addNote()" class="btn-xs-action">+ Add Note</button>
      </div>
      <div *ngFor="let note of config['notes']; let i = index" class="note-config-item">
        <div class="note-config-top">
          <input type="color" [(ngModel)]="note.color" class="color-picker-mini" aria-label="Note colour" />
          <input type="text" [(ngModel)]="note.author" placeholder="Author (e.g. Mom)" class="input-control note-author-input" />
          <button type="button" (click)="removeNote(i)" class="btn-icon-danger" aria-label="Remove"><app-icon name="x" [size]="14"></app-icon></button>
        </div>
        <textarea [(ngModel)]="note.text" placeholder="Note message..." rows="2" class="input-control"></textarea>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class StickyNotesFormComponent extends WidgetFormBase {
  addNote(): void {
    (this.config['notes'] ||= []).push({ id: Date.now().toString(), text: 'New note...', author: 'Family', color: '#fef08a', date: 'Today' });
    this.changed();
  }

  removeNote(i: number): void {
    this.config['notes']?.splice(i, 1);
    this.changed();
  }
}
