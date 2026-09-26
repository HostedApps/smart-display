import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TouchHubConfig, TouchHubItem, DisplayPage } from '../../models/display.model';

@Component({
  selector: 'app-touchhub-dock',
  template: `
    <!-- Hot zone trigger at bottom edge when dock is auto-hidden -->
    <div
      class="dock-hotzone"
      [class.top-zone]="config?.position === 'top'"
      (mouseenter)="revealDock()"
      (touchstart)="revealDock()"
    ></div>

    <!-- Floating Pill Dock -->
    <div
      class="touchhub-dock-container"
      [class.dock-hidden]="isAutoHidden"
      [class.top-position]="config?.position === 'top'"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <div class="dock-pill">
        <!-- Page Navigation Buttons (if pages provided) -->
        <ng-container *ngIf="pages && pages.length > 1">
          <div
            *ngFor="let page of pages; let i = index"
            class="dock-item page-item"
            [class.active]="activePageId === page.id"
            (click)="selectPage(page.id)"
            [title]="page.name"
          >
            <div class="dock-icon page-icon">
              <span class="page-num">{{ i + 1 }}</span>
            </div>
            <span class="dock-label">{{ page.name }}</span>
          </div>
          <div class="dock-divider"></div>
        </ng-container>

        <!-- Configured Action Items -->
        <div
          *ngFor="let item of items"
          class="dock-item"
          (click)="handleAction(item)"
          [title]="item.label"
        >
          <div class="dock-icon">
            <!-- Dynamic SVG Icons -->
            <svg *ngIf="item.icon === 'home'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <svg *ngIf="item.icon === 'edit' || item.action === 'whiteboard'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <svg *ngIf="item.icon === 'check_circle' || item.action === 'tasks'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg *ngIf="item.icon === 'music_note' || item.action === 'spotify'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <svg *ngIf="item.icon === 'nightlight' || item.action === 'nightmode'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12.3 2a10 10 0 0 0-1.9 20 10 10 0 0 0 9.8-12.8A8 8 0 0 1 12.3 2z"/>
            </svg>
            <svg *ngIf="item.icon === 'grid' || item.action === 'pages'" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M4 11h5V5H4v6zm0 7h5v-5H4v5zm7 0h5v-5h-5v5zm6 0h5v-5h-5v5zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
            </svg>
          </div>
          <span class="dock-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      pointer-events: none; /* Container passes through clicks, pill captures clicks */
      z-index: 9999;
    }

    .dock-hotzone {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: 28px;
      z-index: 9998;
      pointer-events: auto;
    }

    .dock-hotzone.top-zone {
      bottom: auto;
      top: 0;
    }

    .touchhub-dock-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: auto;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
    }

    .touchhub-dock-container.top-position {
      bottom: auto;
      top: 24px;
    }

    .touchhub-dock-container.dock-hidden {
      transform: translateX(-50%) translateY(140%);
      opacity: 0;
      pointer-events: none;
    }

    .touchhub-dock-container.top-position.dock-hidden {
      transform: translateX(-50%) translateY(-140%);
      opacity: 0;
      pointer-events: none;
    }

    .dock-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 40px;
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25);
    }

    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      height: 48px;
      padding: 2px 8px;
      border-radius: 24px;
      color: #94a3b8;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dock-item:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      transform: translateY(-2px);
    }

    .dock-item:active {
      transform: scale(0.94);
    }

    .dock-item.active {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }

    .dock-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;
    }

    .page-icon {
      font-weight: 700;
      font-size: 0.82rem;
    }

    .page-num {
      line-height: 1;
    }

    .dock-label {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      margin-top: 2px;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dock-divider {
      width: 1px;
      height: 28px;
      background: rgba(255, 255, 255, 0.15);
      margin: 0 4px;
    }
  `]
})
export class TouchhubDockComponent implements OnInit, OnDestroy {
  @Input() config?: TouchHubConfig;
  @Input() pages: DisplayPage[] = [];
  @Input() activePageId?: string;

  @Output() navigatePage = new EventEmitter<string>();
  @Output() openWhiteboard = new EventEmitter<void>();
  @Output() toggleTasks = new EventEmitter<void>();
  @Output() toggleSpotify = new EventEmitter<void>();
  @Output() toggleNightMode = new EventEmitter<void>();

  isAutoHidden = false;
  private hideTimer: any = null;
  private isHovered = false;

  get items(): TouchHubItem[] {
    if (this.config && Array.isArray(this.config.items) && this.config.items.length > 0) {
      return this.config.items;
    }
    // Default high-value kiosk actions
    return [
      { id: 'th_draw', label: 'Draw', icon: 'edit', action: 'whiteboard' },
      { id: 'th_tasks', label: 'Tasks', icon: 'check_circle', action: 'tasks' },
      { id: 'th_music', label: 'Music', icon: 'music_note', action: 'spotify' },
      { id: 'th_night', label: 'Sleep', icon: 'nightlight', action: 'nightmode' as any }
    ];
  }

  ngOnInit(): void {
    this.resetHideTimer();
  }

  ngOnDestroy(): void {
    this.clearHideTimer();
  }

  @HostListener('window:mousemove')
  @HostListener('window:touchstart')
  onUserInteraction(): void {
    if (this.isAutoHidden) {
      this.revealDock();
    } else {
      this.resetHideTimer();
    }
  }

  revealDock(): void {
    this.isAutoHidden = false;
    this.resetHideTimer();
  }

  onMouseEnter(): void {
    this.isHovered = true;
    this.clearHideTimer();
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.resetHideTimer();
  }

  private resetHideTimer(): void {
    this.clearHideTimer();
    if (this.config?.autoHide === false) {
      this.isAutoHidden = false;
      return;
    }

    // Auto-hide after 4 seconds of inactivity
    this.hideTimer = setTimeout(() => {
      if (!this.isHovered) {
        this.isAutoHidden = true;
      }
    }, 4000);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  selectPage(pageId: string): void {
    this.navigatePage.emit(pageId);
    this.resetHideTimer();
  }

  handleAction(item: TouchHubItem): void {
    this.resetHideTimer();
    switch (item.action) {
      case 'page':
        if (item.target) {
          this.navigatePage.emit(item.target);
        }
        break;
      case 'whiteboard':
        this.openWhiteboard.emit();
        break;
      case 'tasks':
        this.toggleTasks.emit();
        break;
      case 'spotify':
        this.toggleSpotify.emit();
        break;
      case 'nightmode' as any:
        this.toggleNightMode.emit();
        break;
      case 'url':
        if (item.target) {
          window.open(item.target, '_blank');
        }
        break;
    }
  }
}
