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
          <h3 class="widget-title">{{ config.title || 'Family Tasks' }}</h3>
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
    .todo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .todo-icon {
      width: 16px;
      height: 16px;
      color: var(--accent-blue, #0ea5e9);
    }
    .widget-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .task-count {
      font-size: 0.7rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 8px;
      border-radius: 12px;
      font-variant-numeric: tabular-nums;
    }
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
      flex: 1;
    }
    .todo-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
      transition: background 0.15s;
    }
    .todo-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .checkbox.checked {
      background-color: #10b981;
      border-color: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }
    .checkbox svg {
      width: 10px;
      height: 10px;
      stroke: #ffffff;
    }
    .todo-text {
      flex: 1;
      font-size: 0.85rem;
      color: #f1f5f9;
      transition: opacity 0.2s;
    }
    .todo-item.completed .todo-text {
      text-decoration: line-through;
      color: #94a3b8;
      opacity: 0.5;
    }
    .priority-badge {
      font-size: 0.6rem;
      text-transform: uppercase;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .priority-high { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .priority-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .priority-low { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .due-badge {
      font-size: 0.65rem;
      color: #94a3b8;
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
export class TodoWidgetComponent implements OnInit {
  @Input() config: any = {
    title: 'Family Tasks',
    items: [],
    filterCompleted: false,
    allowToggle: true
  };

  private defaultItems: TodoItem[] = [
    { id: '1', text: 'Water the garden plants', completed: false, priority: 'medium' },
    { id: '2', text: 'Groceries: Milk, Eggs, Sourdough', completed: false, priority: 'high', dueDate: 'Today' },
    { id: '3', text: 'Trash & recycling bin to curb', completed: false, priority: 'high', dueDate: '8:00 PM' },
    { id: '4', text: 'Pack gym bag & water bottle', completed: true, priority: 'low' }
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
