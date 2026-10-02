import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { StickyNote } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-sticky-note-widget',
  template: `
    <div class="sticky-board">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
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
      position: relative;
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      overflow-y: auto;
      flex: 1;
      padding: 6px 4px 4px 4px;
    }
    .sticky-note {
      border-radius: 6px;
      padding: 14px 10px 8px 10px;
      color: #1e293b;
      position: relative;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
      transform: rotate(-1.2deg);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 95px;
    }
    .sticky-note:nth-child(even) {
      transform: rotate(1.8deg);
    }
    .sticky-note:hover {
      transform: rotate(0deg) scale(1.03);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }
    .note-pin {
      position: absolute;
      top: -8px;
      left: calc(50% - 6px);
      font-size: 0.85rem;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
    }
    .note-text {
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.3;
      margin: 2px 0 6px 0;
      white-space: pre-wrap;
      font-family: var(--font-handwriting, 'Caveat', cursive);
      color: #0f172a;
    }
    .note-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.65rem;
      color: #475569;
      font-weight: 700;
    }
    .note-author {
      font-style: italic;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #94a3b8;
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

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when the built-in example notes are shown instead of configured ones. */
  get showingSample(): boolean {
    return !(Array.isArray(this.config.notes) && this.config.notes.length > 0);
  }

  get notesList(): StickyNote[] {
    if (this.config.notes && Array.isArray(this.config.notes) && this.config.notes.length > 0) {
      return this.config.notes;
    }
    return this.defaultNotes;
  }

  ngOnInit(): void {}
}
