import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { 
  Widget, 
  DisplayConfig, 
  DisplayResponse, 
  DisplayPage, 
  DisplayOrientation,
  SleepScheduleConfig,
  DisplayBackground,
  User
} from '../../models/display.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-editor',
  template: `
    <div class="admin-layout">
      <!-- Sidebar Control Panel -->
      <aside class="sidebar">
        <!-- User Profile Bar -->
        <div class="user-profile-bar">
          <div class="user-info">
            <div class="user-avatar">{{ (currentUser?.name || 'A')[0] }}</div>
            <span class="user-email">{{ currentUser?.email || 'admin' }}</span>
          </div>
          <button (click)="logout()" class="btn-signout" title="Sign Out">Sign Out</button>
        </div>

        <div class="sidebar-tabs">
          <button [class.active]="activeTab === 'layout'" (click)="activeTab = 'layout'">Layout & Widgets</button>
          <button [class.active]="activeTab === 'pages'" (click)="activeTab = 'pages'">Pages</button>
          <button [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'">Display Settings</button>
        </div>

        <!-- TAB 1: LAYOUT & WIDGETS -->
        <div *ngIf="activeTab === 'layout'" class="tab-content">
          <!-- Page Switcher Bar -->
          <div class="page-selector-bar" *ngIf="pages.length > 1">
            <label>Editing Page:</label>
            <select [(ngModel)]="activePageId" (ngModelChange)="onPageSwitch()" class="input-control">
              <option *ngFor="let p of pages" [value]="p.id">{{ p.name }}</option>
            </select>
          </div>

          <!-- Snap to grid -->
          <div class="grid-controls">
            <label>Snap to Grid:</label>
            <div class="pill-group">
              <button [class.active]="gridSnapSize === 0" (click)="gridSnapSize = 0">Off</button>
              <button [class.active]="gridSnapSize === 10" (click)="gridSnapSize = 10">10px</button>
              <button [class.active]="gridSnapSize === 20" (click)="gridSnapSize = 20">20px</button>
            </div>
          </div>

          <hr class="divider" />

          <h3>Add Widget</h3>
          <div class="widget-palette">
            <button (click)="addWidget('clock')" class="btn btn-secondary">+ Clock</button>
            <button (click)="addWidget('weather')" class="btn btn-secondary">+ Weather</button>
            <button (click)="addWidget('calendar')" class="btn btn-secondary">+ Calendar</button>
            <button (click)="addWidget('photo')" class="btn btn-secondary">+ Photo</button>
            <button (click)="addWidget('rss')" class="btn btn-secondary">+ RSS News</button>
            <button (click)="addWidget('todo')" class="btn btn-secondary">+ Tasks/Todo</button>
            <button (click)="addWidget('homeassistant')" class="btn btn-secondary">+ Smart Home</button>
            <button (click)="addWidget('spotify')" class="btn btn-secondary">+ Spotify</button>
            <button (click)="addWidget('stock_crypto')" class="btn btn-secondary">+ Markets</button>
            <button (click)="addWidget('sticky_note')" class="btn btn-secondary">+ Sticky Note</button>
            <button (click)="addWidget('countdown')" class="btn btn-secondary">+ Countdown</button>
            <button (click)="addWidget('meal_planner')" class="btn btn-secondary">+ Meal Plan</button>
          </div>

          <hr class="divider" />

          <!-- Selected Widget Inspector -->
          <div *ngIf="selectedWidget" class="inspector">
            <div class="inspector-header">
              <h3>Edit {{ selectedWidget.type | titlecase }}</h3>
              <span class="dimension-tag">{{ selectedWidget.position.width }}×{{ selectedWidget.position.height }}</span>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>X (px)</label>
                <input type="number" [(ngModel)]="selectedWidget.position.x" class="input-control" />
              </div>
              <div class="form-group">
                <label>Y (px)</label>
                <input type="number" [(ngModel)]="selectedWidget.position.y" class="input-control" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Width (px)</label>
                <input type="number" [(ngModel)]="selectedWidget.position.width" class="input-control" />
              </div>
              <div class="form-group">
                <label>Height (px)</label>
                <input type="number" [(ngModel)]="selectedWidget.position.height" class="input-control" />
              </div>
            </div>

            <!-- Custom Styling Section -->
            <div class="form-group">
              <label>Opacity ({{ getWidgetOpacity() }}%)</label>
              <input type="range" min="0.2" max="1" step="0.05" [ngModel]="selectedWidget.style?.opacity || 1" (ngModelChange)="setWidgetOpacity($event)" class="slider-control" />
            </div>
            <div class="form-group">
              <label>Corner Radius ({{ selectedWidget.style?.borderRadius || 12 }}px)</label>
              <input type="range" min="0" max="28" step="2" [ngModel]="selectedWidget.style?.borderRadius || 12" (ngModelChange)="setWidgetRadius($event)" class="slider-control" />
            </div>

            <!-- Widget Specific Configs -->
            <!-- Clock -->
            <ng-container *ngIf="selectedWidget.type === 'clock'">
              <div class="form-group">
                <label>Format</label>
                <select [(ngModel)]="selectedWidget.config.format" class="input-control">
                  <option value="hh:mm:ss a">12-Hour (02:30:15 PM)</option>
                  <option value="HH:mm:ss">24-Hour (14:30:15)</option>
                  <option value="hh:mm a">Short 12-Hour (02:30 PM)</option>
                  <option value="HH:mm">Short 24-Hour (14:30)</option>
                </select>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showDate" /> Show Date</label>
              </div>
            </ng-container>

            <!-- Weather -->
            <ng-container *ngIf="selectedWidget.type === 'weather'">
              <div class="form-group">
                <label>OpenWeather API Key</label>
                <input type="text" [(ngModel)]="selectedWidget.config.apiKey" placeholder="API Key" class="input-control" />
              </div>
              <div class="form-group">
                <label>City Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.city" placeholder="City" class="input-control" />
              </div>
              <div class="form-group">
                <label>Units</label>
                <select [(ngModel)]="selectedWidget.config.units" class="input-control">
                  <option value="imperial">Imperial (°F)</option>
                  <option value="metric">Metric (°C)</option>
                </select>
              </div>
            </ng-container>

            <!-- Calendar -->
            <ng-container *ngIf="selectedWidget.type === 'calendar'">
              <div class="form-group">
                <label>View Mode</label>
                <select [(ngModel)]="selectedWidget.config.viewMode" class="input-control">
                  <option value="agenda">Agenda List View</option>
                  <option value="month_grid">Monthly Wall Calendar Grid</option>
                </select>
              </div>
              <div class="form-group">
                <label>Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Family Calendar" class="input-control" />
              </div>
              
              <div class="form-group" *ngIf="!selectedWidget.config.feeds || selectedWidget.config.feeds.length === 0">
                <label>Single iCal URL</label>
                <input type="text" [(ngModel)]="selectedWidget.config.icalUrl" placeholder="https://calendar.google.com/..." class="input-control" />
              </div>

              <!-- Multi-Calendar Feeds Manager -->
              <div class="feeds-manager">
                <div class="section-subhead">
                  <label>Family Member Feeds</label>
                  <button type="button" (click)="addCalendarFeed(selectedWidget)" class="btn-xs-action">+ Add Feed</button>
                </div>
                <div *ngFor="let feed of selectedWidget.config.feeds; let fi = index" class="feed-config-row">
                  <input type="color" [(ngModel)]="feed.color" class="color-picker-mini" />
                  <input type="text" [(ngModel)]="feed.name" placeholder="Name (e.g. Mom)" class="input-control feed-name-input" />
                  <input type="text" [(ngModel)]="feed.url" placeholder="iCal URL (.ics)" class="input-control feed-url-input" />
                  <button type="button" (click)="removeCalendarFeed(selectedWidget, fi)" class="btn-icon-danger">✕</button>
                </div>
              </div>
            </ng-container>

            <!-- Photo -->
            <ng-container *ngIf="selectedWidget.type === 'photo'">
              <div class="form-group">
                <label>Image URLs (one per line)</label>
                <textarea 
                  [ngModel]="getPhotoImagesText(selectedWidget)" 
                  (ngModelChange)="setPhotoImagesText(selectedWidget, $event)" 
                  rows="3" 
                  class="input-control"
                ></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Interval (s)</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.intervalSeconds" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Fit</label>
                  <select [(ngModel)]="selectedWidget.config.fitMode" class="input-control">
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </div>
              </div>
            </ng-container>

            <!-- RSS -->
            <ng-container *ngIf="selectedWidget.type === 'rss'">
              <div class="form-group">
                <label>Feed URL</label>
                <input type="text" [(ngModel)]="selectedWidget.config.feedUrl" class="input-control" />
              </div>
              <div class="form-group">
                <label>Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" class="input-control" />
              </div>
            </ng-container>

            <!-- Todo -->
            <ng-container *ngIf="selectedWidget.type === 'todo'">
              <div class="form-group">
                <label>Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" class="input-control" />
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.filterCompleted" /> Hide Completed</label>
              </div>
            </ng-container>

            <!-- Home Assistant -->
            <ng-container *ngIf="selectedWidget.type === 'homeassistant'">
              <div class="form-group">
                <label>HA URL</label>
                <input type="text" [(ngModel)]="selectedWidget.config.haUrl" placeholder="http://homeassistant.local:8123" class="input-control" />
              </div>
              <div class="form-group">
                <label>Long-Lived Access Token</label>
                <input type="password" [(ngModel)]="selectedWidget.config.token" placeholder="Bearer Token" class="input-control" />
              </div>
            </ng-container>

            <!-- Spotify -->
            <ng-container *ngIf="selectedWidget.type === 'spotify'">
              <div class="form-group">
                <label>Track Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.track" class="input-control" />
              </div>
              <div class="form-group">
                <label>Artist</label>
                <input type="text" [(ngModel)]="selectedWidget.config.artist" class="input-control" />
              </div>
            </ng-container>

            <!-- Markets -->
            <ng-container *ngIf="selectedWidget.type === 'stock_crypto'">
              <div class="form-group">
                <label>Crypto IDs (comma separated)</label>
                <input type="text" [ngModel]="getCryptoIdsText(selectedWidget)" (ngModelChange)="setCryptoIdsText(selectedWidget, $event)" placeholder="bitcoin,ethereum,solana" class="input-control" />
              </div>
            </ng-container>

            <!-- Sticky Notes -->
            <ng-container *ngIf="selectedWidget.type === 'sticky_note'">
              <div class="form-group">
                <label>Board Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Family Notes" class="input-control" />
              </div>
              <div class="section-subhead">
                <label>Notes</label>
                <button type="button" (click)="addStickyNote(selectedWidget)" class="btn-xs-action">+ Add Note</button>
              </div>
              <div *ngFor="let note of selectedWidget.config.notes; let ni = index" class="note-config-item">
                <div class="note-config-top">
                  <input type="color" [(ngModel)]="note.color" class="color-picker-mini" />
                  <input type="text" [(ngModel)]="note.author" placeholder="Author (e.g. Mom)" class="input-control note-author-input" />
                  <button type="button" (click)="removeStickyNote(selectedWidget, ni)" class="btn-icon-danger">✕</button>
                </div>
                <textarea [(ngModel)]="note.text" placeholder="Note message..." rows="2" class="input-control"></textarea>
              </div>
            </ng-container>

            <!-- Countdown -->
            <ng-container *ngIf="selectedWidget.type === 'countdown'">
              <div class="form-group">
                <label>Event Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Hawaii Vacation" class="input-control" />
              </div>
              <div class="form-group">
                <label>Target Date</label>
                <input type="date" [(ngModel)]="selectedWidget.config.targetDate" class="input-control" />
              </div>
              <div class="form-group">
                <label>Emoji Icon</label>
                <input type="text" [(ngModel)]="selectedWidget.config.emoji" placeholder="🌴" class="input-control" />
              </div>
            </ng-container>

            <!-- Meal Planner -->
            <ng-container *ngIf="selectedWidget.type === 'meal_planner'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Weekly Menu" class="input-control" />
              </div>
              <div class="meal-days-editor">
                <div *ngFor="let day of selectedWidget.config.days" class="meal-day-config">
                  <span class="day-label">{{ day.day }}</span>
                  <input type="text" [(ngModel)]="day.lunch" placeholder="Lunch" class="input-control" />
                  <input type="text" [(ngModel)]="day.dinner" placeholder="Dinner" class="input-control" />
                </div>
              </div>
            </ng-container>

            <button (click)="removeSelectedWidget()" class="btn btn-danger">Delete Widget</button>
          </div>
        </div>

        <!-- TAB 2: PAGES MANAGER -->
        <div *ngIf="activeTab === 'pages'" class="tab-content">
          <h3>Multi-Screen Pages</h3>
          <p class="tab-desc">Auto-rotate between different dashboard layouts on a timed carousel.</p>

          <div class="pages-list">
            <div *ngFor="let page of pages; let i = index" class="page-item" [class.selected]="page.id === activePageId">
              <div class="page-top" (click)="activePageId = page.id">
                <span class="page-num">{{ i + 1 }}</span>
                <input type="text" [(ngModel)]="page.name" class="input-control page-name-input" />
              </div>
              <div class="page-bottom">
                <label>Duration:</label>
                <input type="number" [(ngModel)]="page.duration_seconds" min="5" class="input-control duration-input" />
                <span>sec</span>
                <button *ngIf="pages.length > 1" (click)="deletePage(i)" class="btn-icon-danger">✕</button>
              </div>
            </div>
          </div>

          <button (click)="addPage()" class="btn btn-secondary full-width">+ Add New Page</button>
        </div>

        <!-- TAB 3: DISPLAY SETTINGS -->
        <div *ngIf="activeTab === 'settings'" class="tab-content">
          <h3>Screen & System Settings</h3>

          <div class="form-group">
            <label>Display Name</label>
            <input type="text" [(ngModel)]="displayConfig.name" class="input-control" />
          </div>

          <div class="form-group">
            <label>Orientation & Resolution</label>
            <select [(ngModel)]="displayConfig.orientation" (ngModelChange)="updateOrientation()" class="input-control">
              <option value="landscape_720p">Landscape 720p (1280 × 720)</option>
              <option value="landscape_1080p">Landscape 1080p (1920 × 1080)</option>
              <option value="portrait_720p">Portrait 720p (720 × 1280)</option>
              <option value="portrait_1080p">Portrait 1080p (1080 × 1920)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Theme</label>
            <select [(ngModel)]="displayConfig.theme" class="input-control">
              <option value="dark">Dark Slate</option>
              <option value="light">Minimal Light</option>
              <option value="oled">True Black (OLED)</option>
            </select>
          </div>

          <hr class="divider" />

          <h4>Sleep & Night Mode Schedule</h4>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="sleepSchedule.enabled" /> Enable Sleep Schedule
            </label>
          </div>

          <div *ngIf="sleepSchedule.enabled">
            <div class="form-row">
              <div class="form-group">
                <label>Sleep Time</label>
                <input type="time" [(ngModel)]="sleepSchedule.sleepTime" class="input-control" />
              </div>
              <div class="form-group">
                <label>Wake Time</label>
                <input type="time" [(ngModel)]="sleepSchedule.wakeTime" class="input-control" />
              </div>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" [(ngModel)]="sleepSchedule.nightMode" /> Night Clock Mode (Dim Amber)
              </label>
            </div>
          </div>

          <hr class="divider" />

          <h4>Canvas Background</h4>
          <div class="form-group">
            <label>Background Type</label>
            <select [(ngModel)]="backgroundConfig.type" class="input-control">
              <option value="theme">Theme Default</option>
              <option value="color">Solid Color</option>
              <option value="gradient">Gradient</option>
              <option value="image">Custom Image URL</option>
              <option value="unsplash">Curated Wallpaper</option>
            </select>
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'image' || backgroundConfig.type === 'color' || backgroundConfig.type === 'gradient'">
            <label>Value (URL / Hex / CSS)</label>
            <input type="text" [(ngModel)]="backgroundConfig.value" placeholder="https://... or #000000" class="input-control" />
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'image' || backgroundConfig.type === 'unsplash'">
            <label>Blur ({{ backgroundConfig.blur || 0 }}px)</label>
            <input type="range" min="0" max="20" step="1" [(ngModel)]="backgroundConfig.blur" class="slider-control" />
          </div>
        </div>

        <div class="actions">
          <button (click)="saveConfiguration()" [disabled]="saving" class="btn btn-primary">
            {{ saving ? 'Saving...' : 'Save & Publish' }}
          </button>
        </div>
      </aside>

      <!-- Visual Canvas Viewport -->
      <main class="canvas-viewport" (click)="selectedWidget = null">
        <div 
          class="screen-canvas" 
          [ngClass]="[displayConfig.theme, displayConfig.orientation || 'landscape_720p', gridSnapSize > 0 ? 'grid-overlay-' + gridSnapSize : '']" 
          [style.width.px]="canvasWidth"
          [style.height.px]="canvasHeight"
          [style.background]="getCanvasBackgroundStyle()"
          (click)="$event.stopPropagation()"
        >
          <!-- Background image layer -->
          <div 
            *ngIf="getCanvasBackgroundImage()" 
            class="editor-bg-image" 
            [style.backgroundImage]="'url(' + getCanvasBackgroundImage() + ')'"
            [style.filter]="'blur(' + (backgroundConfig.blur || 0) + 'px)'"
          ></div>

          <div 
            *ngFor="let widget of pageWidgets; let i = index"
            class="draggable-widget"
            [class.selected]="selectedWidget === widget"
            [style.left.px]="widget.position.x"
            [style.top.px]="widget.position.y"
            [style.width.px]="widget.position.width"
            [style.height.px]="widget.position.height"
            [style.opacity]="widget.style?.opacity !== undefined ? widget.style?.opacity : 1"
            [style.border-radius.px]="widget.style?.borderRadius !== undefined ? widget.style?.borderRadius : 12"
            (mousedown)="startDrag($event, widget)"
            (click)="selectWidget(widget, $event)"
          >
            <div class="widget-header">
              <span class="widget-badge">{{ widget.type | uppercase }}</span>
              <span class="widget-size">{{ widget.position.width }}×{{ widget.position.height }}</span>
            </div>

            <div class="widget-preview-content">
              <app-clock-widget *ngIf="widget.type === 'clock'" [config]="widget.config"></app-clock-widget>
              <app-weather-widget *ngIf="widget.type === 'weather'" [config]="widget.config"></app-weather-widget>
              <app-calendar-widget *ngIf="widget.type === 'calendar'" [config]="widget.config"></app-calendar-widget>
              <app-photo-widget *ngIf="widget.type === 'photo'" [config]="widget.config"></app-photo-widget>
              <app-rss-widget *ngIf="widget.type === 'rss'" [config]="widget.config"></app-rss-widget>
              <app-todo-widget *ngIf="widget.type === 'todo'" [config]="widget.config"></app-todo-widget>
              <app-homeassistant-widget *ngIf="widget.type === 'homeassistant'" [config]="widget.config"></app-homeassistant-widget>
              <app-spotify-widget *ngIf="widget.type === 'spotify'" [config]="widget.config"></app-spotify-widget>
              <app-stock-crypto-widget *ngIf="widget.type === 'stock_crypto'" [config]="widget.config"></app-stock-crypto-widget>
              <app-sticky-note-widget *ngIf="widget.type === 'sticky_note'" [config]="widget.config"></app-sticky-note-widget>
              <app-countdown-widget *ngIf="widget.type === 'countdown'" [config]="widget.config"></app-countdown-widget>
              <app-meal-planner-widget *ngIf="widget.type === 'meal_planner'" [config]="widget.config"></app-meal-planner-widget>
            </div>

            <!-- 8-Point Visual Resize Handles -->
            <ng-container *ngIf="selectedWidget === widget">
              <div class="resize-handle handle-nw" (mousedown)="startResize($event, widget, 'nw')"></div>
              <div class="resize-handle handle-n"  (mousedown)="startResize($event, widget, 'n')"></div>
              <div class="resize-handle handle-ne" (mousedown)="startResize($event, widget, 'ne')"></div>
              <div class="resize-handle handle-e"  (mousedown)="startResize($event, widget, 'e')"></div>
              <div class="resize-handle handle-se" (mousedown)="startResize($event, widget, 'se')"></div>
              <div class="resize-handle handle-s"  (mousedown)="startResize($event, widget, 's')"></div>
              <div class="resize-handle handle-sw" (mousedown)="startResize($event, widget, 'sw')"></div>
              <div class="resize-handle handle-w"  (mousedown)="startResize($event, widget, 'w')"></div>
            </ng-container>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      background-color: #121824;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .sidebar {
      width: 390px;
      background: #1e293b;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #334155;
      box-sizing: border-box;
      overflow-y: auto;
    }
    .user-profile-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #0b0f19;
      border-bottom: 1px solid #334155;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }
    .user-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-email {
      font-size: 0.75rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-signout {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-signout:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #fff;
    }
    .sidebar-tabs {
      display: flex;
      background: #0f172a;
      border-bottom: 1px solid #334155;
    }
    .sidebar-tabs button {
      flex: 1;
      padding: 12px 8px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .sidebar-tabs button.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      background: #1e293b;
    }
    .tab-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    .tab-desc {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: -6px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #334155;
      margin: 12px 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .form-row {
      display: flex;
      gap: 10px;
    }
    .form-row .form-group {
      flex: 1;
    }
    .input-control {
      background: #0f172a;
      border: 1px solid #334155;
      color: #fff;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .input-control:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .slider-control {
      width: 100%;
      accent-color: #38bdf8;
    }
    .grid-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .pill-group {
      display: flex;
      background: #0f172a;
      border-radius: 6px;
      padding: 2px;
    }
    .pill-group button {
      background: none;
      border: none;
      color: #94a3b8;
      padding: 4px 10px;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .pill-group button.active {
      background: #38bdf8;
      color: #0f172a;
      font-weight: 700;
    }
    .widget-palette {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .btn {
      padding: 8px 12px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #0284c7;
      color: #fff;
      width: 100%;
      padding: 12px;
      font-weight: 600;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-secondary { background: #334155; color: #fff; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: #dc2626; color: #fff; width: 100%; margin-top: 10px; }
    .full-width { width: 100%; }
    .btn-icon-danger { background: none; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; }

    .pages-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .page-item {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .page-item.selected {
      border-color: #38bdf8;
    }
    .page-top {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .page-num {
      background: #334155;
      font-size: 0.75rem;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-bottom {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      font-size: 0.75rem;
    }
    .duration-input {
      width: 60px;
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .dimension-tag {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-family: monospace;
    }

    .section-subhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 8px 0 4px 0;
    }
    .btn-xs-action {
      background: #0284c7;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      cursor: pointer;
    }
    .btn-xs-action:hover { background: #0369a1; }

    .feeds-manager, .meal-days-editor {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .feed-config-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .color-picker-mini {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      padding: 0;
      cursor: pointer;
      background: none;
    }
    .feed-name-input { width: 80px; }
    .feed-url-input { flex: 1; }

    .note-config-item {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 6px;
    }
    .note-config-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .note-author-input { flex: 1; }

    .meal-day-config {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .day-label {
      width: 70px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .actions {
      padding: 16px 20px;
      border-top: 1px solid #334155;
      background: #1e293b;
      margin-top: auto;
    }

    .canvas-viewport {
      flex: 1;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      overflow: auto;
    }
    .screen-canvas {
      position: relative;
      background: #000;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      border: 2px solid #334155;
      border-radius: 8px;
      overflow: hidden;
      transition: width 0.3s, height 0.3s;
      flex-shrink: 0;
    }
    .editor-bg-image {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      z-index: 0;
    }

    /* Grid Snapping Matrix Overlays */
    .grid-overlay-10 {
      background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
      background-size: 10px 10px;
    }
    .grid-overlay-20 {
      background-image: radial-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .draggable-widget {
      position: absolute;
      cursor: move;
      border: 1px dashed rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      box-sizing: border-box;
      user-select: none;
      z-index: 1;
    }
    .draggable-widget.selected {
      border: 2px solid #38bdf8;
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.25);
      z-index: 10;
    }
    .widget-header {
      background: rgba(0, 0, 0, 0.65);
      font-size: 0.65rem;
      padding: 3px 6px;
      letter-spacing: 0.5px;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .widget-badge { font-weight: 700; }
    .widget-size { opacity: 0.7; font-size: 0.6rem; }
    .widget-preview-content {
      height: calc(100% - 20px);
      pointer-events: none;
    }

    /* 8-Point Visual Handles */
    .resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: #ffffff;
      border: 2px solid #0284c7;
      border-radius: 2px;
      z-index: 20;
      box-sizing: border-box;
    }
    .handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
    .handle-n  { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
    .handle-e  { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
    .handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
    .handle-s  { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .handle-w  { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
  `]
})
export class DashboardEditorComponent implements OnInit {
  token: string = '';
  saving: boolean = false;
  activeTab: 'layout' | 'pages' | 'settings' = 'layout';

  displayConfig: DisplayConfig = {
    id: 0,
    name: 'Smart Wall Display',
    theme: 'dark',
    orientation: 'landscape_720p',
    refresh_interval: 60
  };

  sleepSchedule: SleepScheduleConfig = {
    enabled: false,
    sleepTime: '23:00',
    wakeTime: '06:30',
    nightMode: true,
    dimLevel: 0.5
  };

  backgroundConfig: DisplayBackground = {
    type: 'theme',
    value: '',
    blur: 0,
    opacity: 1
  };

  pages: DisplayPage[] = [
    { id: 'default', name: 'Main Dashboard', duration_seconds: 30 }
  ];
  activePageId: string = 'default';

  widgets: Widget[] = [];
  selectedWidget: Widget | null = null;
  gridSnapSize: number = 0; // 0 = Off, 10 = 10px, 20 = 20px

  // Canvas Resolution Dimensions
  canvasWidth: number = 1280;
  canvasHeight: number = 720;

  // Dragging State
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private widgetStartX: number = 0;
  private widgetStartY: number = 0;

  // Resizing State
  private isResizing: boolean = false;
  private resizeHandle: string = '';
  private resizeStartX: number = 0;
  private resizeStartY: number = 0;
  private initPos = { x: 0, y: 0, width: 0, height: 0 };
  currentUser: User | null = null;

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.http.get<DisplayResponse>(`${environment.apiUrl}/get_display.php?token=${this.token}`)
        .subscribe(res => {
          if (res && res.success) {
            this.displayConfig = res.display;
            this.widgets = res.widgets || [];

            if (res.display.pages && res.display.pages.length > 0) {
              this.pages = res.display.pages;
              this.activePageId = this.pages[0].id;
            }

            if (res.display.sleep_schedule) {
              this.sleepSchedule = res.display.sleep_schedule;
            }

            if (res.display.background) {
              this.backgroundConfig = res.display.background;
            }

            this.updateOrientation();
          }
        });
    }

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.stopDragOrResize());
  }

  get pageWidgets(): Widget[] {
    return this.widgets.filter(w => !w.page_id || w.page_id === this.activePageId || w.page_id === 'default');
  }

  updateOrientation(): void {
    const orient = this.displayConfig.orientation || 'landscape_720p';
    switch (orient) {
      case 'landscape_1080p':
        this.canvasWidth = 1920;
        this.canvasHeight = 1080;
        break;
      case 'portrait_720p':
        this.canvasWidth = 720;
        this.canvasHeight = 1280;
        break;
      case 'portrait_1080p':
        this.canvasWidth = 1080;
        this.canvasHeight = 1920;
        break;
      case 'landscape_720p':
      default:
        this.canvasWidth = 1280;
        this.canvasHeight = 720;
        break;
    }
  }

  onPageSwitch(): void {
    this.selectedWidget = null;
  }

  addPage(): void {
    const newPage: DisplayPage = {
      id: 'page_' + Date.now(),
      name: `Page ${this.pages.length + 1}`,
      duration_seconds: 30
    };
    this.pages.push(newPage);
    this.activePageId = newPage.id;
  }

  deletePage(index: number): void {
    if (this.pages.length <= 1) return;
    const removedId = this.pages[index].id;
    this.widgets = this.widgets.filter(w => w.page_id !== removedId);
    this.pages.splice(index, 1);
    this.activePageId = this.pages[0].id;
    this.selectedWidget = null;
  }

  selectWidget(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedWidget = widget;
  }

  addWidget(type: Widget['type']): void {
    let initialConfig: any = {};
    let initialSize = { width: 320, height: 200 };

    switch (type) {
      case 'clock':
        initialConfig = { format: 'hh:mm:ss a', showDate: true };
        initialSize = { width: 300, height: 140 };
        break;
      case 'weather':
        initialConfig = { city: 'San Jose', apiKey: '', units: 'imperial', showForecast: true };
        initialSize = { width: 360, height: 220 };
        break;
      case 'calendar':
        initialConfig = {
          title: 'Family Calendar',
          viewMode: 'agenda',
          maxEvents: 6,
          feeds: [
            { name: 'Kids', url: '', color: '#ec4899' },
            { name: 'Work', url: '', color: '#3b82f6' }
          ]
        };
        initialSize = { width: 380, height: 340 };
        break;
      case 'photo':
        initialConfig = {
          images: [
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&q=80',
            'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1280&q=80'
          ],
          intervalSeconds: 10,
          fitMode: 'cover'
        };
        initialSize = { width: 440, height: 280 };
        break;
      case 'rss':
        initialConfig = { feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml', title: 'World News', maxItems: 4 };
        initialSize = { width: 400, height: 300 };
        break;
      case 'todo':
        initialConfig = { title: 'Daily Tasks', items: [], filterCompleted: false };
        initialSize = { width: 340, height: 260 };
        break;
      case 'homeassistant':
        initialConfig = { haUrl: '', token: '', entities: [] };
        initialSize = { width: 360, height: 220 };
        break;
      case 'spotify':
        initialConfig = { track: 'Midnight City', artist: 'M83', isPlaying: true };
        initialSize = { width: 360, height: 160 };
        break;
      case 'stock_crypto':
        initialConfig = { cryptoIds: ['bitcoin', 'ethereum', 'solana'], currency: 'USD' };
        initialSize = { width: 360, height: 260 };
        break;
      case 'sticky_note':
        initialConfig = {
          title: 'Family Notes',
          notes: [
            { id: '1', text: 'Don\'t forget soccer practice at 5:00 PM! ⚽', author: 'Mom', color: '#fef08a', date: 'Today' },
            { id: '2', text: 'Picked up groceries 🥖🍏', author: 'Dad', color: '#bbf7d0', date: 'Today' }
          ]
        };
        initialSize = { width: 340, height: 260 };
        break;
      case 'countdown':
        initialConfig = {
          title: 'Hawaii Vacation',
          targetDate: '2026-12-25',
          emoji: '🌴'
        };
        initialSize = { width: 300, height: 220 };
        break;
      case 'meal_planner':
        initialConfig = {
          title: 'Weekly Menu',
          days: [
            { day: 'Monday', lunch: 'Salad Bowl', dinner: 'Pasta Primavera' },
            { day: 'Tuesday', lunch: 'Turkey Wrap', dinner: 'Taco Tuesday 🌮' },
            { day: 'Wednesday', lunch: 'Minestrone Soup', dinner: 'Baked Salmon' },
            { day: 'Thursday', lunch: 'Buddha Bowl', dinner: 'Pizza Night 🍕' },
            { day: 'Friday', lunch: 'BLT', dinner: 'Thai Green Curry' },
            { day: 'Saturday', lunch: 'Cafe Lunch', dinner: 'BBQ Burgers 🍔' },
            { day: 'Sunday', lunch: 'Roast', dinner: 'Charcuterie Board' }
          ]
        };
        initialSize = { width: 360, height: 340 };
        break;
    }

    const newWidget: Widget = {
      id: Date.now(),
      page_id: this.activePageId,
      type: type,
      position: { x: 50, y: 50, width: initialSize.width, height: initialSize.height },
      style: { opacity: 1, borderRadius: 12, backdropBlur: true },
      config: initialConfig
    };
    this.widgets.push(newWidget);
    this.selectedWidget = newWidget;
  }

  removeSelectedWidget(): void {
    if (!this.selectedWidget) return;
    this.widgets = this.widgets.filter(w => w !== this.selectedWidget);
    this.selectedWidget = null;
  }

  getWidgetOpacity(): number {
    return Math.round(((this.selectedWidget?.style?.opacity !== undefined ? this.selectedWidget.style.opacity : 1)) * 100);
  }

  setWidgetOpacity(val: number): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.opacity = Number(val);
  }

  setWidgetRadius(val: number): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.borderRadius = Number(val);
  }

  getPhotoImagesText(widget: Widget): string {
    if (!widget.config.images) return '';
    return Array.isArray(widget.config.images) ? widget.config.images.join('\n') : String(widget.config.images);
  }

  setPhotoImagesText(widget: Widget, text: string): void {
    widget.config.images = text.split('\n').map(l => l.trim()).filter(l => !!l);
  }

  getCryptoIdsText(widget: Widget): string {
    if (!widget.config.cryptoIds) return '';
    return Array.isArray(widget.config.cryptoIds) ? widget.config.cryptoIds.join(', ') : String(widget.config.cryptoIds);
  }

  setCryptoIdsText(widget: Widget, text: string): void {
    widget.config.cryptoIds = text.split(',').map(s => s.trim().toLowerCase()).filter(s => !!s);
  }

  getCanvasBackgroundImage(): string | null {
    if (this.backgroundConfig.type === 'image' && this.backgroundConfig.value) {
      return this.backgroundConfig.value;
    }
    if (this.backgroundConfig.type === 'unsplash') {
      return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80';
    }
    return null;
  }

  getCanvasBackgroundStyle(): string | null {
    if (this.backgroundConfig.type === 'color' || this.backgroundConfig.type === 'gradient') {
      return this.backgroundConfig.value;
    }
    return null;
  }

  private snap(val: number): number {
    if (this.gridSnapSize <= 0) return Math.round(val);
    return Math.round(val / this.gridSnapSize) * this.gridSnapSize;
  }

  startDrag(event: MouseEvent, widget: Widget): void {
    if (this.isResizing) return;
    this.isDragging = true;
    this.selectedWidget = widget;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.widgetStartX = widget.position.x;
    this.widgetStartY = widget.position.y;
  }

  startResize(event: MouseEvent, widget: Widget, handle: string): void {
    event.stopPropagation();
    this.isResizing = true;
    this.isDragging = false;
    this.selectedWidget = widget;
    this.resizeHandle = handle;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.initPos = { ...widget.position };
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.selectedWidget) return;

    if (this.isDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;

      const rawX = Math.max(0, Math.min(this.canvasWidth - this.selectedWidget.position.width, this.widgetStartX + dx));
      const rawY = Math.max(0, Math.min(this.canvasHeight - this.selectedWidget.position.height, this.widgetStartY + dy));

      this.selectedWidget.position.x = this.snap(rawX);
      this.selectedWidget.position.y = this.snap(rawY);
    } else if (this.isResizing) {
      const dx = event.clientX - this.resizeStartX;
      const dy = event.clientY - this.resizeStartY;
      const minW = 100;
      const minH = 60;

      let newX = this.initPos.x;
      let newY = this.initPos.y;
      let newW = this.initPos.width;
      let newH = this.initPos.height;

      if (this.resizeHandle.includes('e')) {
        newW = Math.max(minW, Math.min(this.canvasWidth - this.initPos.x, this.initPos.width + dx));
      } else if (this.resizeHandle.includes('w')) {
        const pW = this.initPos.width - dx;
        if (pW >= minW && this.initPos.x + dx >= 0) {
          newW = pW;
          newX = this.initPos.x + dx;
        }
      }

      if (this.resizeHandle.includes('s')) {
        newH = Math.max(minH, Math.min(this.canvasHeight - this.initPos.y, this.initPos.height + dy));
      } else if (this.resizeHandle.includes('n')) {
        const pH = this.initPos.height - dy;
        if (pH >= minH && this.initPos.y + dy >= 0) {
          newH = pH;
          newY = this.initPos.y + dy;
        }
      }

      this.selectedWidget.position.x = this.snap(newX);
      this.selectedWidget.position.y = this.snap(newY);
      this.selectedWidget.position.width = this.snap(newW);
      this.selectedWidget.position.height = this.snap(newH);
    }
  }

  stopDragOrResize(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = '';
  }

  saveConfiguration(): void {
    this.saving = true;
    const payload = {
      token: this.token,
      name: this.displayConfig.name,
      theme: this.displayConfig.theme,
      orientation: this.displayConfig.orientation,
      refresh_interval: this.displayConfig.refresh_interval,
      background: this.backgroundConfig,
      sleep_schedule: this.sleepSchedule,
      pages: this.pages,
      widgets: this.widgets
    };

    this.http.post(`${environment.apiUrl}/save_display.php`, payload)
      .subscribe({
        next: () => {
          this.saving = false;
          alert('Display layout and settings saved successfully!');
        },
        error: (err) => {
          this.saving = false;
          alert('Failed to save layout: ' + (err.error?.error || err.message));
        }
      });
  }

  addCalendarFeed(widget: Widget): void {
    if (!widget.config.feeds) widget.config.feeds = [];
    widget.config.feeds.push({ name: 'Family', url: '', color: '#ec4899' });
  }

  removeCalendarFeed(widget: Widget, index: number): void {
    if (widget.config.feeds) {
      widget.config.feeds.splice(index, 1);
    }
  }

  addStickyNote(widget: Widget): void {
    if (!widget.config.notes) widget.config.notes = [];
    widget.config.notes.push({
      id: Date.now().toString(),
      text: 'New note...',
      author: 'Family',
      color: '#fef08a',
      date: 'Today'
    });
  }

  removeStickyNote(widget: Widget, index: number): void {
    if (widget.config.notes) {
      widget.config.notes.splice(index, 1);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
