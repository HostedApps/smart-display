import { Component, Input, OnInit, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { TodoItem } from '../../models/display.model';
import { environment } from '../../../environments/environment';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-todo-widget',
  template: `
    <div class="todo-card sd-card">
      <div class="todo-header">
        <div class="title-group">
          <svg class="todo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <h3 class="widget-title">{{ config.title || 'Family Tasks' }}</h3>
        </div>
        <div class="header-actions">
          <span class="task-count">{{ completedCount }}/{{ items.length }}</span>
          <button class="add-task-btn" (click)="openAddModal($event)" title="Add Task on Screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="plus-icon">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      <!-- Quick Task Creation Drawer/Modal -->
      <div class="add-task-panel" *ngIf="showAddModal" (click)="$event.stopPropagation()">
        <input 
          #taskInput
          type="text" 
          class="task-input" 
          placeholder="New task..." 
          [(ngModel)]="newTaskText"
          (keyup.enter)="submitNewTask()"
          autofocus
        />
        <div class="add-panel-footer">
          <div class="priority-picker">
            <button 
              type="button" 
              class="pri-chip" 
              [class.active]="newTaskPriority === 'low'"
              (click)="newTaskPriority = 'low'">Low</button>
            <button 
              type="button" 
              class="pri-chip" 
              [class.active]="newTaskPriority === 'medium'"
              (click)="newTaskPriority = 'medium'">Med</button>
            <button 
              type="button" 
              class="pri-chip pri-high" 
              [class.active]="newTaskPriority === 'high'"
              (click)="newTaskPriority = 'high'">High</button>
          </div>
          <div class="panel-buttons">
            <button class="btn-cancel" (click)="closeAddModal()">Cancel</button>
            <button class="btn-save" (click)="submitNewTask()" [disabled]="!newTaskText.trim()">Save</button>
          </div>
        </div>
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
          <button *ngIf="item.completed" class="delete-item-btn" (click)="deleteItem(item, $event)" title="Delete task">
            ✕
          </button>
        </div>
      </div>

      <ng-template #emptyState>
        <app-widget-state *ngIf="isLive && items.length === 0; else noActiveTasks" icon="📝" message="No tasks yet" hint="Tap Add to create a task."></app-widget-state>
        <ng-template #noActiveTasks>
          <div class="empty-state">
            <p>No active tasks</p>
          </div>
        </ng-template>
      </ng-template>
    </div>
  `,
  styles: [`
    .todo-card {
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
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
      border-bottom: var(--sd-border);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .todo-icon {
      width: 16px;
      height: 16px;
      color: var(--sd-accent);
    }
    .widget-title {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      margin: 0;
      color: var(--sd-text);
    }
    .task-count {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-accent);
      background: var(--sd-accent-soft);
      padding: 2px 8px;
      border-radius: var(--sd-radius-sm);
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
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      cursor: pointer;
      transition: background 0.15s;
    }
    .todo-item:hover {
      background: var(--sd-surface-3);
    }
    .checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1.5px solid var(--sd-text-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .checkbox.checked {
      background-color: var(--sd-success);
      border-color: var(--sd-success);
      box-shadow: 0 0 8px color-mix(in srgb, var(--sd-success) 50%, transparent);
    }
    .checkbox svg {
      width: 10px;
      height: 10px;
      stroke: var(--sd-on-accent);
    }
    .todo-text {
      flex: 1;
      font-size: var(--sd-fs-body);
      color: var(--sd-text);
      transition: opacity 0.2s;
    }
    .todo-item.completed .todo-text {
      text-decoration: line-through;
      color: var(--sd-text-muted);
      opacity: 0.5;
    }
    .priority-badge {
      font-size: var(--sd-fs-xs);
      text-transform: uppercase;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .priority-high { background: var(--sd-danger-soft); color: var(--sd-danger); border: 1px solid color-mix(in srgb, var(--sd-danger) 40%, transparent); }
    .priority-medium { background: var(--sd-warning-soft); color: var(--sd-warning); border: 1px solid color-mix(in srgb, var(--sd-warning) 40%, transparent); }
    .priority-low { background: color-mix(in srgb, var(--sd-info) 16%, transparent); color: var(--sd-info); border: 1px solid color-mix(in srgb, var(--sd-info) 40%, transparent); }
    .due-badge {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
    }
    .delete-item-btn {
      background: none;
      border: none;
      color: var(--sd-danger);
      font-size: var(--sd-fs-sm);
      padding: 2px 4px;
      cursor: pointer;
      opacity: 0.6;
      border-radius: 4px;
      transition: opacity 0.15s;
    }
    .delete-item-btn:hover {
      opacity: 1;
      background: var(--sd-danger-soft);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .add-task-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--sd-accent-soft);
      border: 1px solid var(--sd-accent-border);
      color: var(--sd-accent);
      border-radius: var(--sd-radius-sm);
      padding: 2px 8px;
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .add-task-btn:hover {
      background: var(--sd-accent-border);
      border-color: var(--sd-accent);
    }
    .plus-icon {
      width: 12px;
      height: 12px;
    }
    .add-task-panel {
      background: var(--sd-surface-2);
      border: 1px solid var(--sd-accent-border);
      border-radius: var(--sd-radius-sm);
      padding: 8px 10px;
      margin-bottom: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-input {
      background: var(--sd-surface-3);
      border: var(--sd-border);
      border-radius: 6px;
      color: var(--sd-text);
      padding: 6px 8px;
      font-size: var(--sd-fs-sm);
      outline: none;
    }
    .task-input:focus {
      border-color: var(--sd-accent);
    }
    .add-panel-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .priority-picker {
      display: flex;
      gap: 4px;
    }
    .pri-chip {
      background: var(--sd-surface-2);
      border: var(--sd-border);
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
    }
    .pri-chip.active {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent);
      color: var(--sd-accent);
    }
    .pri-chip.pri-high.active {
      background: var(--sd-danger-soft);
      border-color: var(--sd-danger);
      color: var(--sd-danger);
    }
    .panel-buttons {
      display: flex;
      gap: 6px;
    }
    .btn-cancel {
      background: none;
      border: none;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-sm);
      cursor: pointer;
      padding: 3px 6px;
    }
    .btn-save {
      background: var(--sd-accent);
      border: none;
      color: var(--sd-on-accent);
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      border-radius: 5px;
      padding: 3px 10px;
      cursor: pointer;
    }
    .btn-save:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-body);
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

  showAddModal: boolean = false;
  newTaskText: string = '';
  newTaskPriority: 'low' | 'medium' | 'high' = 'medium';

  private displayToken: string = '';

  private defaultItems: TodoItem[] = [
    { id: '1', text: 'Water the garden plants', completed: false, priority: 'medium' },
    { id: '2', text: 'Groceries: Milk, Eggs, Sourdough', completed: false, priority: 'high', dueDate: 'Today' },
    { id: '3', text: 'Trash & recycling bin to curb', completed: false, priority: 'high', dueDate: '8:00 PM' },
    { id: '4', text: 'Pack gym bag & water bottle', completed: true, priority: 'low' }
  ];

  get items(): TodoItem[] {
    if (!this.config.items || !Array.isArray(this.config.items)) {
      // Live displays start empty: sample tasks must never be written into (and saved with) the config
      this.config.items = this.isLive ? [] : [...this.defaultItems];
    }
    return this.config.items;
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

  readonly isLive: boolean;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    this.displayToken = this.route.snapshot.paramMap.get('token') || '';
  }

  openAddModal(e: MouseEvent): void {
    e.stopPropagation();
    this.showAddModal = true;
    this.newTaskText = '';
    this.newTaskPriority = 'medium';
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newTaskText = '';
  }

  submitNewTask(): void {
    const text = this.newTaskText.trim();
    if (!text) return;

    const newItem: TodoItem = {
      id: 'task_' + Date.now(),
      text,
      completed: false,
      priority: this.newTaskPriority,
      dueDate: 'Today'
    };

    this.items.unshift(newItem);
    this.closeAddModal();

    if (this.displayToken) {
      this.http.post(`${environment.apiUrl}/tasks_sync.php`, {
        action: 'add',
        token: this.displayToken,
        text,
        priority: this.newTaskPriority
      }).subscribe({
        next: (res: any) => {
          if (res?.createdTask?.id) {
            newItem.id = res.createdTask.id;
          }
        },
        error: () => {}
      });
    }
  }

  deleteItem(item: TodoItem, e: MouseEvent): void {
    e.stopPropagation();
    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }

    if (this.displayToken) {
      this.http.post(`${environment.apiUrl}/tasks_sync.php`, {
        action: 'delete',
        token: this.displayToken,
        taskId: item.id
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  toggleItem(item: TodoItem): void {
    if (this.config.allowToggle !== false) {
      item.completed = !item.completed;

      // Sync completion status to backend
      if (this.displayToken) {
        this.http.post(`${environment.apiUrl}/tasks_sync.php`, {
          token: this.displayToken,
          taskId: item.id,
          completed: item.completed,
          text: item.text,
          priority: item.priority
        }).subscribe({
          next: () => {},
          error: () => {}
        });
      }
    }
  }
}
