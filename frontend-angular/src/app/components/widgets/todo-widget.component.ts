import { Component, Input, OnInit } from '@angular/core';
import { TodoItem } from '../../models/display.model';

@Component({
  selector: 'app-todo-widget',
  template: `
    <div class="todo-card">
      <div class="todo-header">
        <div class="title-group">
          <svg class="todo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <h3 class="widget-title">{{ config.title || 'Tasks & Checklist' }}</h3>
        </div>
        <span class="task-count">{{ completedCount }}/{{ items.length }}</span>
      </div>

      <div class="todo-list" *ngIf="displayItems.length > 0; else emptyState">
        <div 
          *ngFor="let item of displayItems" 
          class="todo-item" 
          [class.completed]="item.completed"
          (click)="toggleItem(item)"
        >
          <div class="checkbox" [class.checked]="item.completed">
            <svg *ngIf="item.completed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="todo-text">{{ item.text }}</span>
          <span *ngIf="item.priority && !item.completed" class="priority-badge" [ngClass]="'priority-' + item.priority">
            {{ item.priority }}
          </span>
          <span *ngIf="item.dueDate && !item.completed" class="due-badge">
            {{ item.dueDate }}
          </span>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <p>No active tasks</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .todo-card {
      height: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .todo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .todo-icon {
      width: 18px;
      height: 18px;
      color: #38bdf8;
    }
    .widget-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
    }
    .task-count {
      font-size: 0.8rem;
      opacity: 0.7;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      flex: 1;
    }
    .todo-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .todo-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .checkbox.checked {
      background-color: #10b981;
      border-color: #10b981;
    }
    .checkbox svg {
      width: 12px;
      height: 12px;
      stroke: #ffffff;
    }
    .todo-text {
      flex: 1;
      font-size: 0.9rem;
      color: #f1f5f9;
      transition: opacity 0.2s;
    }
    .todo-item.completed .todo-text {
      text-decoration: line-through;
      opacity: 0.45;
    }
    .priority-badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .priority-high { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .priority-medium { background: rgba(245, 158, 11, 0.25); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .priority-low { background: rgba(59, 130, 246, 0.25); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .due-badge {
      font-size: 0.7rem;
      opacity: 0.65;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      opacity: 0.5;
      font-size: 0.9rem;
    }
  `]
})
export class TodoWidgetComponent implements OnInit {
  @Input() config: any = {
    title: 'Family Tasks',
    items: [],
    filterCompleted: false,
    allowToggle: true
  };

  private defaultItems: TodoItem[] = [
    { id: '1', text: 'Water the plants', completed: false, priority: 'medium' },
    { id: '2', text: 'Groceries: Milk, Eggs, Sourdough', completed: false, priority: 'high', dueDate: 'Today' },
    { id: '3', text: 'Trash & recycling bin to curb', completed: false, priority: 'high', dueDate: '8:00 PM' },
    { id: '4', text: 'Pack gym bag', completed: true, priority: 'low' }
  ];

  get items(): TodoItem[] {
    if (this.config.items && Array.isArray(this.config.items) && this.config.items.length > 0) {
      return this.config.items;
    }
    return this.defaultItems;
  }

  get displayItems(): TodoItem[] {
    const list = this.items;
    if (this.config.filterCompleted) {
      return list.filter(i => !i.completed);
    }
    return list;
  }

  get completedCount(): number {
    return this.items.filter(i => i.completed).length;
  }

  ngOnInit(): void {}

  toggleItem(item: TodoItem): void {
    if (this.config.allowToggle !== false) {
      item.completed = !item.completed;
    }
  }
}
