import { Component, Input, OnInit, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { TodoItem } from '../../models/display.model';
import { environment } from '../../../environments/environment';
import { LIVE_DISPLAY } from './widget-context';

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
    .delete-item-btn {
      background: none;
      border: none;
      color: #f87171;
      font-size: 0.75rem;
      padding: 2px 4px;
      cursor: pointer;
      opacity: 0.6;
      border-radius: 4px;
      transition: opacity 0.15s;
    }
    .delete-item-btn:hover {
      opacity: 1;
      background: rgba(239, 68, 68, 0.15);
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
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      border-radius: 8px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .add-task-btn:hover {
      background: rgba(56, 189, 248, 0.3);
      border-color: #38bdf8;
    }
    .plus-icon {
      width: 12px;
      height: 12px;
    }
    .add-task-panel {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #ffffff;
      padding: 6px 8px;
      font-size: 0.8rem;
      outline: none;
    }
    .task-input:focus {
      border-color: #38bdf8;
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 0.65rem;
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
    }
    .pri-chip.active {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .pri-chip.pri-high.active {
      background: rgba(239, 68, 68, 0.25);
      border-color: #f87171;
      color: #f87171;
    }
    .panel-buttons {
      display: flex;
      gap: 6px;
    }
    .btn-cancel {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.7rem;
      cursor: pointer;
      padding: 3px 6px;
    }
    .btn-save {
      background: #0284c7;
      border: none;
      color: #ffffff;
      font-size: 0.7rem;
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
