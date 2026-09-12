import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TodoWidgetComponent } from './todo-widget.component';

describe('TodoWidgetComponent (Horizon 1: Two-Way Task Sync)', () => {
  let component: TodoWidgetComponent;
  let fixture: ComponentFixture<TodoWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodoWidgetComponent],
      imports: [HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create todo widget component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle item completion status locally on touch', () => {
    const item = { id: 'task_1', text: 'Clean garage', completed: false, priority: 'medium' as const };
    component.config = {
      title: 'Chores',
      items: [item],
      allowToggle: true
    };

    component.toggleItem(item);
    expect(item.completed).toBe(true);
    expect(component.completedCount).toBe(1);

    component.toggleItem(item);
    expect(item.completed).toBe(false);
    expect(component.completedCount).toBe(0);
  });

  it('should filter completed tasks when filterCompleted is enabled', () => {
    component.config = {
      items: [
        { id: '1', text: 'Task 1', completed: false },
        { id: '2', text: 'Task 2', completed: true }
      ],
      filterCompleted: true
    };

    expect(component.displayItems.length).toBe(1);
    expect(component.displayItems[0].id).toBe('1');
  });
});
