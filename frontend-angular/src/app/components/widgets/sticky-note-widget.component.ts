import { Component, Input, OnInit } from '@angular/core';
import { StickyNote } from '../../models/display.model';

@Component({
  selector: 'app-sticky-note-widget',
  template: `
    <div class="sticky-board">
      <div class="board-header">
        <div class="title-wrap">
          <span class="pin-icon">📌</span>
          <h3 class="widget-title">{{ config.title || 'Family Notes' }}</h3>
        </div>
      </div>

      <div class="notes-grid" *ngIf="notesList.length > 0; else noNotes">
        <div 
          *ngFor="let note of notesList" 
          class="sticky-note"
          [style.backgroundColor]="note.color || '#fef08a'"
        >
          <div class="note-pin">📍</div>
          <p class="note-text">{{ note.text }}</p>
          <div class="note-footer">
            <span class="note-author" *ngIf="note.author">— {{ note.author }}</span>
            <span class="note-date" *ngIf="note.date">{{ note.date }}</span>
          </div>
        </div>
      </div>

      <ng-template #noNotes>
        <div class="empty-state">
          <p>No sticky notes posted</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .sticky-board {
      height: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 12px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pin-icon {
      font-size: 1rem;
    }
    .widget-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      overflow-y: auto;
      flex: 1;
      padding: 4px;
    }
    .sticky-note {
      border-radius: 4px;
      padding: 12px 10px 8px 10px;
      color: #1e293b;
      position: relative;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
      transform: rotate(-1deg);
      transition: transform 0.2s;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 90px;
    }
    .sticky-note:nth-child(even) {
      transform: rotate(1.5deg);
    }
    .sticky-note:hover {
      transform: rotate(0deg) scale(1.02);
      z-index: 2;
    }
    .note-pin {
      position: absolute;
      top: -6px;
      left: calc(50% - 6px);
      font-size: 0.75rem;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
    }
    .note-text {
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.35;
      margin: 4px 0 8px 0;
      white-space: pre-wrap;
      font-family: 'Caveat', 'Comic Sans MS', cursive, sans-serif;
    }
    .note-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.65rem;
      opacity: 0.75;
      font-weight: 600;
    }
    .note-author {
      font-style: italic;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      opacity: 0.5;
      font-size: 0.85rem;
    }
  `]
})
export class StickyNoteWidgetComponent implements OnInit {
  @Input() config: any = {
    title: 'Family Sticky Notes',
    notes: []
  };

  private defaultNotes: StickyNote[] = [
    { id: '1', text: 'Don\'t forget soccer practice at 5:00 PM today! ⚽', author: 'Mom', color: '#fef08a', date: 'Today' },
    { id: '2', text: 'I picked up sourdough bread and apples 🥖🍏', author: 'Dad', color: '#bbf7d0', date: 'Yesterday' }
  ];

  get notesList(): StickyNote[] {
    if (this.config.notes && Array.isArray(this.config.notes) && this.config.notes.length > 0) {
      return this.config.notes;
    }
    return this.defaultNotes;
  }

  ngOnInit(): void {}
}
