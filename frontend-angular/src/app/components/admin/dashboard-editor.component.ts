import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  Widget, 
  WidgetSchedule,
  WidgetRule,
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
import { AudioChimeService } from '../../services/audio-chime.service';
import { AVAILABLE_FONTS, loadGoogleFont, getFontFamilyString, FontOption } from '../../utils/font-loader.util';
import { DASHBOARD_TEMPLATES, DashboardTemplate } from '../../utils/dashboard-templates.util';
import { SevereWeatherAlertData } from '../widgets/severe-weather-alert-banner.component';

@Component({
  selector: 'app-dashboard-editor',
  template: `
    <div class="admin-layout">
      <!-- Sidebar Control Panel -->
      <aside class="sidebar">
        <!-- User Profile & Fleet Nav Bar -->
        <div class="user-profile-bar">
          <button (click)="goToFleet()" class="btn-back-fleet" title="Back to Fleet Hub">
            <span>‹</span> All Displays
          </button>
          <button (click)="showHelpModal = true" class="btn-help-mini" title="Open Help Center & Widget Documentation">
            📖 Help
          </button>
          <button (click)="openInstallationGuide()" class="btn-guide-mini" title="Open Client Hardware Installation Guide (PDF)">
            📄 PDF Guide
          </button>
          <div class="user-info">
            <div class="user-avatar">{{ (currentUser?.name || 'A')[0] }}</div>
          </div>
        </div>

        <!-- Brand Logo Header Slot -->
        <div class="admin-brand-card">
          <div class="brand-slot-preview" (click)="activeTab = 'settings'" title="Click to configure Brand Logo & Watermark">
            <img *ngIf="logoUrl" [src]="logoUrl" alt="Brand Logo" class="brand-slot-img" />
            <div *ngIf="!logoUrl" class="brand-slot-empty">
              <span class="logo-text-ph">BRAND LOGO</span>
              <span class="logo-sub-ph">Click to customize</span>
            </div>
          </div>
          <div class="brand-display-meta">
            <h2 class="display-title-heading">{{ displayConfig.name }}</h2>
            <span class="res-tag" title="Canvas Resolution Dimensions">{{ canvasWidth }}×{{ canvasHeight }}</span>
          </div>
        </div>

        <div class="sidebar-tabs">
          <button [class.active]="activeTab === 'layout'" (click)="activeTab = 'layout'" title="Widget Palette & Canvas Layout">Layout</button>
          <button [class.active]="activeTab === 'layers'" (click)="activeTab = 'layers'" title="Block Layers & Z-Index Stack">Layers</button>
          <button [class.active]="activeTab === 'pages'" (click)="activeTab = 'pages'" title="Multi-Screen Rotating Pages & Scheduling">Pages</button>
          <button [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'" title="Screen Resolution, Theme, Sleep Schedule">Settings</button>
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
            <label title="Align widgets to grid increments">Snap to Grid:</label>
            <div class="pill-group">
              <button [class.active]="gridSnapSize === 0" (click)="gridSnapSize = 0" title="Freeform pixel positioning">Off</button>
              <button [class.active]="gridSnapSize === 10" (click)="gridSnapSize = 10" title="Snap to 10px increments">10px</button>
              <button [class.active]="gridSnapSize === 20" (click)="gridSnapSize = 20" title="Snap to 20px increments">20px</button>
            </div>
          </div>

          <hr class="divider" />

          <div class="layout-action-row">
            <button 
              type="button"
              class="btn-templates"
              (click)="openTemplatesModal()"
              title="Explore pre-built starter templates for the canvas"
            >
              🎨 Templates
            </button>
            <button 
              type="button"
              class="btn-auto-arrange"
              (click)="openAutoArrangeModal()"
              [disabled]="pageWidgets.length < 2"
              title="Auto-arrange widgets into aesthetic layouts"
            >
              ✨ Auto Arrange
            </button>
          </div>

          <hr class="divider" />

          <div class="palette-header">
            <h3>Add Widget</h3>
            <span class="palette-badge">29 Widgets</span>
          </div>
          <div class="widget-palette">
            <button (click)="addWidget('youtube')" class="palette-item" title="Embed ambient YouTube videos or live news/music streams with auto-play and loop">
              <span class="palette-icon">▶️</span>
              <span class="palette-title">YouTube</span>
            </button>
            <button (click)="addWidget('ai_briefing')" class="palette-item" title="AI-synthesized daily morning and evening executive updates using Google Gemini or ambient engine">
              <span class="palette-icon">🧠</span>
              <span class="palette-title">AI Briefing</span>
            </button>
            <button (click)="addWidget('chores')" class="palette-item" title="Interactive Hearth-style family chore charts with avatar emojis, flame streaks, and confetti">
              <span class="palette-icon">🏆</span>
              <span class="palette-title">Chores & Habits</span>
            </button>
            <button (click)="addWidget('camera_pip')" class="palette-item" title="Low-latency RTSP/MJPEG live doorbell and security camera PIP stream with snapshot refresh HUD">
              <span class="palette-icon">📹</span>
              <span class="palette-title">Live Camera</span>
            </button>
            <button (click)="addWidget('commute')" class="palette-item" title="Real-time driving route traffic ETA matrices and public transit live departure countdowns">
              <span class="palette-icon">🚗</span>
              <span class="palette-title">Commute</span>
            </button>
            <button (click)="addWidget('clock')" class="palette-item" title="Precision digital clock with 12h/24h formats, date display, and typography styling">
              <span class="palette-icon">⏰</span>
              <span class="palette-title">Clock</span>
            </button>
            <button (click)="addWidget('weather')" class="palette-item" title="Current temperature, weather condition icons, humidity, wind, and 5-day forecast">
              <span class="palette-icon">⛅</span>
              <span class="palette-title">Weather</span>
            </button>
            <button (click)="addWidget('calendar')" class="palette-item" title="Monthly calendar grid and agenda list synchronized with Google Calendar, iCloud, and Outlook iCal">
              <span class="palette-icon">📅</span>
              <span class="palette-title">Calendar</span>
            </button>
            <button (click)="addWidget('photo')" class="palette-item" title="Rotating family photo album slideshow with crossfade transitions">
              <span class="palette-icon">🖼️</span>
              <span class="palette-title">Photos</span>
            </button>
            <button (click)="addWidget('rss')" class="palette-item" title="Live headline ticker pulling from major news outlets, tech blogs, and custom RSS XML feeds">
              <span class="palette-icon">📰</span>
              <span class="palette-title">RSS News</span>
            </button>
            <button (click)="addWidget('todo')" class="palette-item" title="Shared family or office checklist with strike-through task completion">
              <span class="palette-icon">📝</span>
              <span class="palette-title">Tasks</span>
            </button>
            <button (click)="addWidget('homeassistant')" class="palette-item" title="Displays live entity states, lights, sensors, temperature gauges from Home Assistant">
              <span class="palette-icon">🏠</span>
              <span class="palette-title">Smart Home</span>
            </button>
            <button (click)="addWidget('spotify')" class="palette-item" title="Shows active track artwork, artist name, progress bar, and playback status">
              <span class="palette-icon">🎵</span>
              <span class="palette-title">Spotify</span>
            </button>
            <button (click)="addWidget('stock_crypto')" class="palette-item" title="Live price tracking for Bitcoin, Ethereum, and major stock market indices">
              <span class="palette-icon">📈</span>
              <span class="palette-title">Markets</span>
            </button>
            <button (click)="addWidget('sticky_note')" class="palette-item" title="Colored virtual post-it notes with handwriting typography">
              <span class="palette-icon">📌</span>
              <span class="palette-title">Sticky Notes</span>
            </button>
            <button (click)="addWidget('countdown')" class="palette-item" title="Live countdown timer to vacations, weddings, birthdays, or product launches">
              <span class="palette-icon">⏳</span>
              <span class="palette-title">Countdown</span>
            </button>
            <button (click)="addWidget('meal_planner')" class="palette-item" title="Weekly Monday-to-Sunday dinner and lunch meal schedule for the whole family">
              <span class="palette-icon">🍽️</span>
              <span class="palette-title">Meal Plan</span>
            </button>
            <button (click)="addWidget('radar')" class="palette-item" title="Live animated Doppler rain and cloud radar map for your geographical region">
              <span class="palette-icon">🛰️</span>
              <span class="palette-title">Radar</span>
            </button>
            <button (click)="addWidget('quote')" class="palette-item" title="Daily motivational thoughts, stoic philosophy, or custom family mottos">
              <span class="palette-icon">💬</span>
              <span class="palette-title">Daily Quote</span>
            </button>
            <button (click)="addWidget('text')" class="palette-item" title="Static text announcements, room labels, or custom messages">
              <span class="palette-icon">📝</span>
              <span class="palette-title">Text</span>
            </button>
            <button (click)="addWidget('qrcode')" class="palette-item" title="Generate QR codes for WiFi passwords, URLs, or contact info">
              <span class="palette-icon">📱</span>
              <span class="palette-title">QR Code</span>
            </button>
            <button (click)="addWidget('world_clocks')" class="palette-item" title="Multiple timezone clocks for distributed teams or family abroad">
              <span class="palette-icon">🌐</span>
              <span class="palette-title">World Clocks</span>
            </button>
            <button (click)="addWidget('shapes')" class="palette-item" title="Decorative shapes, dividers, color panels, and visual separators">
              <span class="palette-icon">⬛</span>
              <span class="palette-title">Shapes</span>
            </button>
            <button (click)="addWidget('scheduled_text')" class="palette-item" title="Text announcements that appear and disappear at scheduled times">
              <span class="palette-icon">⏰</span>
              <span class="palette-title">Scheduled Text</span>
            </button>
            <button (click)="addWidget('button')" class="palette-item" title="Interactive touch buttons for navigation between pages or external links">
              <span class="palette-icon">🔘</span>
              <span class="palette-title">Button</span>
            </button>
            <button (click)="addWidget('sun_moon')" class="palette-item" title="Sunrise, sunset times and current moon phase with illumination">
              <span class="palette-icon">🌙</span>
              <span class="palette-title">Sun & Moon</span>
            </button>
            <button (click)="addWidget('analog_clock')" class="palette-item" title="Classic analog clock dial with hour, minute, and second hands">
              <span class="palette-icon">🕐</span>
              <span class="palette-title">Analog Clock</span>
            </button>
            <button (click)="addWidget('rest_fetch')" class="palette-item" title="Fetch live JSON data from Home Assistant or external REST APIs">
              <span class="palette-icon">📡</span>
              <span class="palette-title">REST Data</span>
            </button>
            <button (click)="addWidget('gauge')" class="palette-item" title="Semicircular radial gauge meter for temperatures, CPU, or metrics">
              <span class="palette-icon">⚡</span>
              <span class="palette-title">Gauge</span>
            </button>
            <button (click)="addWidget('whiteboard')" class="palette-item" title="Touch-interactive family whiteboard and chalkboard for notes and doodles">
              <span class="palette-icon">🎨</span>
              <span class="palette-title">Whiteboard</span>
            </button>
            <button (click)="addWidget('google_maps')" class="palette-item" title="Interactive map embed with location search, zoom, and live traffic">
              <span class="palette-icon">🗺️</span>
              <span class="palette-title">Google Maps</span>
            </button>
            <button (click)="addWidget('slack')" class="palette-item" title="Live Slack channel message feed with avatars and timestamps">
              <span class="palette-icon">💬</span>
              <span class="palette-title">Slack Feed</span>
            </button>
            <button (click)="addWidget('gmail')" class="palette-item" title="Gmail inbox unread count badge and latest email previews">
              <span class="palette-icon">✉️</span>
              <span class="palette-title">Gmail Inbox</span>
            </button>
            <button (click)="addWidget('tradingview')" class="palette-item" title="Interactive TradingView financial candlestick and area charts">
              <span class="palette-icon">📈</span>
              <span class="palette-title">TradingView</span>
            </button>
            <button (click)="addWidget('reddit')" class="palette-item" title="Live Reddit photo slideshow from curated photography subreddits">
              <span class="palette-icon">📸</span>
              <span class="palette-title">Reddit Media</span>
            </button>
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

            <div class="form-group">
              <label>Widget Font Override</label>
              <select [ngModel]="selectedWidget.style?.fontFamily || ''" (ngModelChange)="setWidgetFont($event)" class="input-control">
                <option value="">Default Canvas Font</option>
                <option *ngFor="let font of availableFonts" [value]="font.id">{{ font.name }}</option>
              </select>
            </div>

            <!-- Layer Properties (Rename, Lock, Hide) -->
            <div class="form-group">
              <label>Layer Nickname</label>
              <input type="text" [(ngModel)]="selectedWidget.customName" [placeholder]="getWidgetTypeLabel(selectedWidget.type)" class="input-control" />
            </div>
            <div class="form-row layer-quick-toggles">
              <button 
                type="button"
                class="btn-layer-pill" 
                [class.active]="selectedWidget.locked" 
                (click)="selectedWidget.locked = !selectedWidget.locked"
                [title]="selectedWidget.locked ? 'Unlock Widget' : 'Lock Widget to canvas position'"
              >
                {{ selectedWidget.locked ? '🔒 Locked' : '🔓 Unlocked' }}
              </button>
              <button 
                type="button"
                class="btn-layer-pill" 
                [class.active]="selectedWidget.hidden" 
                (click)="selectedWidget.hidden = !selectedWidget.hidden"
                [title]="selectedWidget.hidden ? 'Show on canvas' : 'Hide from canvas'"
              >
                {{ selectedWidget.hidden ? '🕶️ Hidden' : '👁️ Visible' }}
              </button>
            </div>

            <!-- Active Schedule Section -->
            <div class="schedule-config-box">
              <div class="schedule-header" (click)="toggleWidgetScheduleEnabled()">
                <div class="schedule-title-wrap">
                  <span class="schedule-icon">🕒</span>
                  <span class="schedule-title">Active Schedule</span>
                </div>
                <input type="checkbox" [checked]="isWidgetScheduleEnabled(selectedWidget)" (click)="$event.stopPropagation(); toggleWidgetScheduleEnabled()" />
              </div>

              <div class="schedule-body" *ngIf="isWidgetScheduleEnabled(selectedWidget)">
                <div class="form-row">
                  <div class="form-group">
                    <label>Start Time</label>
                    <input type="time" [(ngModel)]="getOrCreateWidgetSchedule(selectedWidget).startTime" class="input-control" />
                  </div>
                  <div class="form-group">
                    <label>End Time</label>
                    <input type="time" [(ngModel)]="getOrCreateWidgetSchedule(selectedWidget).endTime" class="input-control" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Active Days</label>
                  <div class="days-pill-row">
                    <button 
                      *ngFor="let day of weekDays; let dIdx = index" 
                      type="button" 
                      class="day-pill"
                      [class.active]="isDaySelected(getOrCreateWidgetSchedule(selectedWidget), dIdx)"
                      (click)="toggleDay(getOrCreateWidgetSchedule(selectedWidget), dIdx)"
                    >
                      {{ day }}
                    </button>
                  </div>
                  <div class="day-presets">
                    <button type="button" class="btn-preset-mini" (click)="setDayPreset(getOrCreateWidgetSchedule(selectedWidget), 'all')">Everyday</button>
                    <button type="button" class="btn-preset-mini" (click)="setDayPreset(getOrCreateWidgetSchedule(selectedWidget), 'weekdays')">Weekdays</button>
                    <button type="button" class="btn-preset-mini" (click)="setDayPreset(getOrCreateWidgetSchedule(selectedWidget), 'weekends')">Weekends</button>
                  </div>
                </div>
              </div>
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
              <div class="weather-notice-banner">
                <span class="weather-notice-icon">🌤️</span>
                <span><strong>No API Key Required!</strong> Live temperature, conditions, UV index, and Air Quality (AQI) fetch automatically via Open-Meteo.</span>
              </div>

              <div class="form-group">
                <label>City Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.city" placeholder="e.g. San Jose, CA or London" class="input-control" />
                <div class="field-hint" style="font-size: 0.68rem; color: #94a3b8; margin-top: 4px;">
                  Supports any global city or state (e.g. "Austin, TX", "Paris", "Tokyo").
                </div>
              </div>

              <div class="form-group">
                <label>Units</label>
                <select [(ngModel)]="selectedWidget.config.units" class="input-control">
                  <option value="imperial">Imperial (°F, mph)</option>
                  <option value="metric">Metric (°C, m/s)</option>
                </select>
              </div>

              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showForecast" /> Show 5-Day Forecast Strip</label>
              </div>

              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showHourly" /> Show 12-Hour Hourly Forecast</label>
              </div>

              <div class="form-group">
                <label>Severe Weather Alert (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.alert" placeholder="e.g. Winter Storm Warning" class="input-control" />
              </div>

              <details style="margin-top: 8px; font-size: 0.72rem; color: #94a3b8; cursor: pointer;">
                <summary style="outline: none;">Advanced: Custom OpenWeather API Key</summary>
                <div class="form-group" style="margin-top: 8px;">
                  <label style="font-size: 0.68rem;">OpenWeather API Key (Optional)</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.apiKey" placeholder="Leave blank to use zero-config Open-Meteo" class="input-control" />
                </div>
              </details>
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

            <!-- Photo Slideshow, Google Photos & Apple iCloud Albums -->
            <ng-container *ngIf="selectedWidget.type === 'photo'">
              <div class="form-group">
                <label>Google Photos or Apple iCloud Shared Album URL</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedWidget.config.albumUrl" 
                  placeholder="https://photos.app.goo.gl/... or https://www.icloud.com/sharedalbum/#..." 
                  class="input-control" 
                />
                <small style="font-size:0.65rem; color:#38bdf8;">Paste any Google Photos or Apple iCloud public shared album link to automatically stream photos.</small>
              </div>

              <div class="form-group">
                <label>Or Custom Image URLs (one per line)</label>
                <textarea 
                  [ngModel]="getPhotoImagesText(selectedWidget)" 
                  (ngModelChange)="setPhotoImagesText(selectedWidget, $event)" 
                  rows="3" 
                  class="input-control"
                  placeholder="https://images.unsplash.com/..."
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Slide Interval (s)</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.intervalSeconds" min="3" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Image Fit</label>
                  <select [(ngModel)]="selectedWidget.config.fitMode" class="input-control">
                    <option value="cover">Cover (Fill Frame)</option>
                    <option value="contain">Contain (Fit Whole Photo)</option>
                  </select>
                </div>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.blurBackground" /> Blur Backdrop when Contained</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.kenBurns" /> Cinematic Ken Burns Pan & Zoom</label>
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

            <!-- Home Assistant & Smart Home -->
            <ng-container *ngIf="selectedWidget.type === 'homeassistant'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Smart Home" class="input-control" />
              </div>

              <div class="form-group">
                <label>Home Assistant URL (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.haUrl" placeholder="http://homeassistant.local:8123 or Nabu Casa" class="input-control" />
              </div>
              <div class="form-group">
                <label>Long-Lived Access Token (Optional)</label>
                <input type="password" [(ngModel)]="selectedWidget.config.token" placeholder="Bearer Token" class="input-control" />
                <small style="font-size:0.65rem; color:#94a3b8;">Leave blank to use interactive simulated smart tiles.</small>
              </div>

              <div class="smart-home-guide-box">
                <strong>🔌 Google Home & Alexa Integration:</strong>
                <p>Connect Google Home & Alexa through Home Assistant (Matter / Cloud) or customize the smart tiles directly below:</p>
              </div>

              <div class="section-subhead">
                <label>Smart Entities</label>
                <button type="button" (click)="addSmartHomeEntity(selectedWidget)" class="btn-xs-action">+ Add Entity</button>
              </div>
              <div *ngFor="let ent of (selectedWidget.config.entities || []); let ei = index" class="note-config-item">
                <div class="note-config-top">
                  <input type="text" [(ngModel)]="ent.icon" placeholder="💡" style="width:36px; text-align:center;" class="input-control" />
                  <input type="text" [(ngModel)]="ent.label" placeholder="Entity Label (e.g. Living Room)" class="input-control" />
                  <button type="button" (click)="removeSmartHomeEntity(selectedWidget, ei)" class="btn-icon-danger">✕</button>
                </div>
                <div class="form-row" style="margin-top:4px;">
                  <input type="text" [(ngModel)]="ent.entityId" placeholder="light.living_room" class="input-control" />
                  <input type="text" [(ngModel)]="ent.state" placeholder="on / 72°F" class="input-control" style="max-width:80px;" />
                </div>
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

            <!-- Markets & Stocks Ticker -->
            <ng-container *ngIf="selectedWidget.type === 'stock_crypto'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Markets & Stocks" class="input-control" />
              </div>

              <div class="form-group">
                <label>Stock Symbols (comma separated)</label>
                <input 
                  type="text" 
                  [ngModel]="getStockSymbolsText(selectedWidget)" 
                  (ngModelChange)="setStockSymbolsText(selectedWidget, $event)" 
                  placeholder="AAPL, TSLA, NVDA, SPY, MSFT, GOOGL" 
                  class="input-control" 
                />
                <div class="quick-tags-row">
                  <span class="quick-tag-label">Quick Add:</span>
                  <button type="button" (click)="addQuickStock(selectedWidget, 'AAPL')" class="tag-pill">+ AAPL</button>
                  <button type="button" (click)="addQuickStock(selectedWidget, 'TSLA')" class="tag-pill">+ TSLA</button>
                  <button type="button" (click)="addQuickStock(selectedWidget, 'NVDA')" class="tag-pill">+ NVDA</button>
                  <button type="button" (click)="addQuickStock(selectedWidget, 'SPY')" class="tag-pill">+ SPY</button>
                  <button type="button" (click)="addQuickStock(selectedWidget, 'MSFT')" class="tag-pill">+ MSFT</button>
                </div>
              </div>

              <div class="form-group">
                <label>Crypto IDs (comma separated)</label>
                <input 
                  type="text" 
                  [ngModel]="getCryptoIdsText(selectedWidget)" 
                  (ngModelChange)="setCryptoIdsText(selectedWidget, $event)" 
                  placeholder="bitcoin, ethereum, solana, dogecoin" 
                  class="input-control" 
                />
                <div class="quick-tags-row">
                  <span class="quick-tag-label">Quick Add:</span>
                  <button type="button" (click)="addQuickCrypto(selectedWidget, 'bitcoin')" class="tag-pill">+ BTC</button>
                  <button type="button" (click)="addQuickCrypto(selectedWidget, 'ethereum')" class="tag-pill">+ ETH</button>
                  <button type="button" (click)="addQuickCrypto(selectedWidget, 'solana')" class="tag-pill">+ SOL</button>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Display Mode</label>
                  <select [(ngModel)]="selectedWidget.config.mode" class="input-control">
                    <option value="all">Combined (Stocks & Crypto)</option>
                    <option value="stocks">Stocks Only</option>
                    <option value="crypto">Crypto Only</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <select [(ngModel)]="selectedWidget.config.currency" class="input-control">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showSparklines" /> Show Mini Trend Sparklines</label>
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

            <!-- Radar -->
            <ng-container *ngIf="selectedWidget.type === 'radar'">
              <div class="radar-notice-banner">
                <span class="radar-notice-icon">ℹ️</span>
                <span><strong>No API Key Required!</strong> Powered by RainViewer Global Precipitation Doppler Radar.</span>
              </div>

              <div class="form-group">
                <label>Quick City Preset</label>
                <select (change)="onRadarCitySelect(selectedWidget, $event)" class="input-control">
                  <option value="">-- Choose City or Enter Manually --</option>
                  <option value="San Francisco|37.77|-122.42">San Francisco, CA</option>
                  <option value="New York|40.71|-74.00">New York, NY</option>
                  <option value="Los Angeles|34.05|-118.24">Los Angeles, CA</option>
                  <option value="Chicago|41.88|-87.63">Chicago, IL</option>
                  <option value="Seattle|47.60|-122.33">Seattle, WA</option>
                  <option value="Miami|25.76|-80.19">Miami, FL</option>
                  <option value="Austin|30.27|-97.74">Austin, TX</option>
                  <option value="Dallas|32.78|-96.80">Dallas, TX</option>
                  <option value="Denver|39.74|-104.99">Denver, CO</option>
                  <option value="Boston|42.36|-71.06">Boston, MA</option>
                  <option value="Toronto|43.65|-79.38">Toronto, Canada</option>
                  <option value="London|51.51|-0.13">London, UK</option>
                  <option value="Paris|48.86|2.35">Paris, France</option>
                  <option value="Berlin|52.52|13.40">Berlin, Germany</option>
                  <option value="Tokyo|35.68|139.69">Tokyo, Japan</option>
                  <option value="Sydney|-33.87|151.21">Sydney, Australia</option>
                </select>
              </div>

              <div class="form-group">
                <label>Location / City Label</label>
                <input type="text" [(ngModel)]="selectedWidget.config.cityName" placeholder="San Francisco Bay Area" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Latitude</label>
                  <input type="number" step="0.01" [(ngModel)]="selectedWidget.config.lat" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Longitude</label>
                  <input type="number" step="0.01" [(ngModel)]="selectedWidget.config.lon" class="input-control" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Zoom Level (3-12)</label>
                  <input type="number" min="3" max="12" [(ngModel)]="selectedWidget.config.zoom" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Color Palette</label>
                  <select [(ngModel)]="selectedWidget.config.colorScheme" class="input-control">
                    <option [value]="0">Original Black/White</option>
                    <option [value]="1">Universal Blue</option>
                    <option [value]="2">TITAN (Standard)</option>
                    <option [value]="3">The Weather Channel</option>
                    <option [value]="5">NEXRAD Level III</option>
                    <option [value]="6">Rainbow</option>
                  </select>
                </div>
              </div>
            </ng-container>

            <!-- Daily Quote -->
            <ng-container *ngIf="selectedWidget.type === 'quote'">
              <div class="form-group">
                <label>Category</label>
                <select [(ngModel)]="selectedWidget.config.category" class="input-control">
                  <option value="inspirational">Inspirational Thoughts</option>
                  <option value="wisdom">Stoic Philosophy & Wisdom</option>
                  <option value="history">On This Day in History</option>
                  <option value="custom">Custom Family Motto</option>
                </select>
              </div>
              <div *ngIf="selectedWidget.config.category === 'custom'">
                <div class="form-group">
                  <label>Custom Quote Text</label>
                  <textarea [(ngModel)]="selectedWidget.config.customQuote" placeholder="Family is not an important thing. It's everything." rows="2" class="input-control"></textarea>
                </div>
                <div class="form-group">
                  <label>Author</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.customAuthor" placeholder="Michael J. Fox" class="input-control" />
                </div>
              </div>
            </ng-container>

            <!-- AI Ambient Briefing -->
            <ng-container *ngIf="selectedWidget.type === 'ai_briefing'">
              <div class="form-group">
                <label>Your Name (for personalized greetings)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.userName" placeholder="e.g. Sandip" class="input-control" />
              </div>
              <div class="form-group">
                <label>Assistant Tone</label>
                <select [(ngModel)]="selectedWidget.config.tone" class="input-control">
                  <option value="warm">Warm & Encouraging (Family)</option>
                  <option value="executive">Executive & Concise (Office)</option>
                  <option value="motivational">High-Energy & Motivational</option>
                </select>
              </div>
              <div class="form-group">
                <label>Google Gemini API Key (Optional)</label>
                <div style="display: flex; gap: 8px;">
                  <input type="password" [(ngModel)]="selectedWidget.config.apiKey" placeholder="Leave blank to use built-in ambient engine" class="input-control" style="flex: 1;" />
                  <button type="button" (click)="testGeminiKey()" [disabled]="testingGemini" class="btn btn-secondary" style="white-space: nowrap; padding: 0 12px; font-size: 0.8rem;">
                    {{ testingGemini ? 'Testing...' : 'Test Key' }}
                  </button>
                </div>
                <div *ngIf="geminiTestResult" [style.color]="geminiTestResult.success ? '#34d399' : '#f87171'" style="font-size: 0.72rem; margin-top: 5px; font-weight: 600; word-break: break-word;">
                  {{ geminiTestResult.success ? '✅ ' : '❌ ' }}{{ geminiTestResult.message }}
                </div>
                <small style="font-size:0.65rem; color:#94a3b8; display: block; margin-top: 4px;">Default built-in intelligence engine works with zero setup.</small>
              </div>
            </ng-container>

            <!-- Gamified Chores & Habits -->
            <ng-container *ngIf="selectedWidget.type === 'chores'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Family Chores & Habits" class="input-control" />
              </div>
              <p style="font-size:0.75rem; color:#94a3b8;">
                Family members can interactively complete tasks, gain streak points, and trigger confetti directly on the screen!
              </p>
            </ng-container>

            <!-- Live Camera PIP -->
            <ng-container *ngIf="selectedWidget.type === 'camera_pip'">
              <div class="form-group">
                <label>Camera Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="e.g. Driveway & Front Porch" class="input-control" />
              </div>
              <div class="form-group">
                <label>Snapshot URL (or Home Assistant proxy)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.snapshotUrl" placeholder="http://192.168.1.50/snapshot.jpg" class="input-control" />
              </div>
              <div class="form-group">
                <label>Video Stream URL (Optional WebRTC/HLS/MJPEG)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.streamUrl" placeholder="http://.../mjpeg or WebRTC stream" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Aspect Ratio</label>
                  <select [(ngModel)]="selectedWidget.config.aspectRatio" class="input-control">
                    <option value="16:9">16 : 9 (Widescreen)</option>
                    <option value="4:3">4 : 3 (Standard)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Refresh Interval</label>
                  <select [(ngModel)]="selectedWidget.config.refreshSeconds" class="input-control">
                    <option [value]="2">2 seconds (Live)</option>
                    <option [value]="4">4 seconds (Balanced)</option>
                    <option [value]="10">10 seconds</option>
                  </select>
                </div>
              </div>
              <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 10px; margin-top: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">💡 Google & SimpliSafe Feed Tips:</div>
                <div style="font-size: 0.68rem; color: #cbd5e1; line-height: 1.4;">
                  • <strong>Home Assistant or Scrypted Bridge (Recommended):</strong> Google Nest and SimpliSafe protect their feeds behind cloud logins. Bridging them through Home Assistant or Scrypted produces an instant local snapshot or WebRTC/MJPEG URL you can paste above.<br>
                  • <strong>Nest Public Live Link:</strong> In the Nest app, enable "Camera Sharing" &gt; "Share with password" or "Share publicly", and paste the embed link into Video Stream URL.
                </div>
              </div>
            </ng-container>

            <!-- Live Commute & Transit -->
            <ng-container *ngIf="selectedWidget.type === 'commute'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Morning Commute" class="input-control" />
              </div>
              <div class="form-group">
                <label>Default View Mode</label>
                <select [(ngModel)]="selectedWidget.config.mode" class="input-control">
                  <option value="driving">Driving Routes & Live Traffic</option>
                  <option value="transit">Public Transit Departures</option>
                </select>
              </div>
            </ng-container>

            <!-- YouTube Video / Stream Config -->
            <ng-container *ngIf="selectedWidget.type === 'youtube'">
              <div class="form-group">
                <label>Widget Title (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="e.g. Lofi Chill Beats / NASA Live" class="input-control" />
              </div>
              <div class="form-group">
                <label>YouTube URL or Video ID</label>
                <input type="text" [(ngModel)]="selectedWidget.config.urlOrId" placeholder="https://www.youtube.com/watch?v=... or ID" class="input-control" />
                <small style="font-size:0.65rem; color:#94a3b8;">Supports standard watch links, youtu.be, shorts, and live streams.</small>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.autoplay" /> Auto-Play Video</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.muted" /> Mute Audio (Required for wall kiosk autoplay)</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.loop" /> Loop Continuously</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showControls" /> Show Video Controls</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.isLive" /> Show Red "LIVE" Badge</label>
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'text'">
              <div class="form-group">
                <label>Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" class="input-control" />
              </div>
              <div class="form-group">
                <label>Body Text (Supports Line Breaks)</label>
                <textarea [(ngModel)]="selectedWidget.config.body" rows="4" class="input-control"></textarea>
              </div>
              <div class="form-group">
                <label>Font Size</label>
                <select [(ngModel)]="selectedWidget.config.fontSize" class="input-control">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div class="form-group">
                <label>Text Alignment</label>
                <select [(ngModel)]="selectedWidget.config.textAlign" class="input-control">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'qrcode'">
              <div class="form-group">
                <label>Label</label>
                <input type="text" [(ngModel)]="selectedWidget.config.label" class="input-control" />
              </div>
              <div class="form-group">
                <label>QR Code Data (URL, text, WiFi string)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.data" class="input-control" />
              </div>
              <div class="form-group">
                <label>Size (px)</label>
                <input type="number" [(ngModel)]="selectedWidget.config.size" class="input-control" />
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'shapes'">
              <div class="form-group">
                <label>Shape Type</label>
                <select [(ngModel)]="selectedWidget.config.shape" class="input-control">
                  <option value="rectangle">Rectangle Fill</option>
                  <option value="circle">Circle</option>
                  <option value="horizontal_line">Horizontal Line (Divider)</option>
                  <option value="vertical_line">Vertical Line (Divider)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Color (Hex or Name)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.color" class="input-control" />
              </div>
              <div class="form-group">
                <label>Fill Opacity (0.0 - 1.0)</label>
                <input type="number" step="0.1" min="0" max="1" [(ngModel)]="selectedWidget.config.fillOpacity" class="input-control" />
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'scheduled_text'">
              <div class="form-group">
                <label>Announcement Message</label>
                <textarea [(ngModel)]="selectedWidget.config.message" rows="3" class="input-control"></textarea>
              </div>
              <div class="form-group">
                <label>Start Time (HH:MM)</label>
                <input type="time" [(ngModel)]="selectedWidget.config.startTime" class="input-control" />
              </div>
              <div class="form-group">
                <label>End Time (HH:MM)</label>
                <input type="time" [(ngModel)]="selectedWidget.config.endTime" class="input-control" />
              </div>
              <div class="form-group">
                <label>Active Days (comma separated: Mon,Tue,Wed)</label>
                <input type="text" [ngModel]="selectedWidget.config.showDays?.join(',')" (ngModelChange)="selectedWidget.config.showDays = $event.split(',')" class="input-control" />
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'button'">
              <div class="form-group">
                <label>Button Label</label>
                <input type="text" [(ngModel)]="selectedWidget.config.label" class="input-control" />
              </div>
              <div class="form-group">
                <label>Icon (Emoji)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.icon" class="input-control" />
              </div>
              <div class="form-group">
                <label>Target URL (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.url" placeholder="https://..." class="input-control" />
              </div>
              <div class="form-group">
                <label>Button Style</label>
                <select [(ngModel)]="selectedWidget.config.style" class="input-control">
                  <option value="gradient">Vibrant Gradient</option>
                  <option value="solid">Solid Indigo</option>
                  <option value="outline">Outline Transparent</option>
                </select>
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'sun_moon'">
              <div class="form-group">
                <label>City Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.cityName" class="input-control" />
              </div>
              <div class="form-group">
                <label>Latitude</label>
                <input type="number" step="0.0001" [(ngModel)]="selectedWidget.config.latitude" class="input-control" />
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input type="number" step="0.0001" [(ngModel)]="selectedWidget.config.longitude" class="input-control" />
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'analog_clock'">
              <div class="form-group">
                <label>Accent Color (Hex)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.accentColor" class="input-control" />
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showSeconds" /> Show Second Hand</label>
              </div>
              <div class="form-group checkbox-group">
                <label><input type="checkbox" [(ngModel)]="selectedWidget.config.showNumbers" /> Show Numbers</label>
              </div>
            </ng-container>
            
            <ng-container *ngIf="selectedWidget.type === 'rest_fetch'">
              <div class="form-group">
                <label>1-Click Quick Preset</label>
                <select (change)="applyRestFetchPreset(selectedWidget, $any($event.target).value)" class="input-control">
                  <option value="">Select a preset or custom API...</option>
                  <option value="homeassistant">🏠 Home Assistant Sensor (corelabel-infraRA)</option>
                  <option value="bitcoin">🪙 Bitcoin Live Price (CoinGecko)</option>
                  <option value="ip_geo">📍 Public IP & City (ipapi.co)</option>
                </select>
              </div>

              <div class="form-group">
                <label>REST Endpoint URL</label>
                <input type="text" [(ngModel)]="selectedWidget.config.url" placeholder="https://api.example.com/data.json" class="input-control" />
              </div>

              <div class="form-group">
                <label>Authorization Header (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.authHeader" placeholder="Bearer YOUR_TOKEN" class="input-control" />
              </div>

              <div class="form-group">
                <label>JSON Data Key / Path</label>
                <input type="text" [(ngModel)]="selectedWidget.config.jsonPath" placeholder="state or data.price" class="input-control" />
                <span class="field-hint">e.g. <code>state</code> for Home Assistant, <code>bitcoin.usd</code> for crypto</span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Title Header</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Feed Title" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Icon / Emoji</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.icon" placeholder="🌐" class="input-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Value Prefix</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.prefix" placeholder="$" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Value Suffix / Unit</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.unit" placeholder="°F, %, kW" class="input-control" />
                </div>
              </div>

              <div class="form-group">
                <label>Refresh Interval (seconds)</label>
                <input type="number" min="5" max="3600" [(ngModel)]="selectedWidget.config.refreshSeconds" class="input-control" />
              </div>
            </ng-container>

            <ng-container *ngIf="selectedWidget.type === 'gauge'">
              <div class="form-row">
                <div class="form-group">
                  <label>Current Value</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.value" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Unit Label</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.unit" placeholder="°F, %, kW" class="input-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Min Scale</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.min" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Max Scale</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.max" class="input-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Title Header</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Gauge Title" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Icon / Emoji</label>
                  <input type="text" [(ngModel)]="selectedWidget.config.icon" placeholder="⚡" class="input-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Warning (Amber)</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.warnThreshold" placeholder="75" class="input-control" />
                </div>
                <div class="form-group">
                  <label>Critical (Red)</label>
                  <input type="number" [(ngModel)]="selectedWidget.config.critThreshold" placeholder="90" class="input-control" />
                </div>
              </div>

              <div class="form-group">
                <label>Color Theme</label>
                <select [(ngModel)]="selectedWidget.config.colorScheme" class="input-control">
                  <option value="green-yellow-red">Emerald → Amber → Crimson (Standard)</option>
                  <option value="blue-cyan-emerald">Sky Blue → Cyan → Emerald</option>
                </select>
              </div>

              <div class="push-webhook-box">
                <span class="push-box-title">📡 Inbound Webhook / HA Push</span>
                <p class="tab-desc">Push live data directly into this gauge via HTTP POST:</p>
                <code class="webhook-snippet">POST /api/push_widget.php<br>{{ '{' }} "token": "{{ token }}", "widget_id": {{ selectedWidget.id }}, "value": 78.5 {{ '}' }}</code>
              </div>
            </ng-container>

            <ng-container *ngIf="selectedWidget.type === 'whiteboard'">
              <div class="form-group">
                <label>Canvas Board Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.canvasTitle" placeholder="Family Notes & Doodles" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Default Pen Color</label>
                  <input type="color" [(ngModel)]="selectedWidget.config.defaultColor" class="input-control" style="height: 38px; padding: 2px;" />
                </div>
                <div class="form-group">
                  <label>Background Color</label>
                  <input type="color" [(ngModel)]="selectedWidget.config.backgroundColor" class="input-control" style="height: 38px; padding: 2px;" />
                </div>
              </div>
              <div class="form-group">
                <label>Default Stroke Width: {{ selectedWidget.config.defaultSize || 3 }}px</label>
                <input type="range" min="1" max="12" step="1" [(ngModel)]="selectedWidget.config.defaultSize" class="slider-control" />
              </div>
            </ng-container>

            <ng-container *ngIf="selectedWidget.type === 'google_maps'">
              <div class="form-group">
                <label>Widget Title</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="Live Traffic & Map" class="input-control" />
              </div>
              <div class="form-group">
                <label>Location / Address or City</label>
                <input type="text" [(ngModel)]="selectedWidget.config.address" placeholder="Austin, TX" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Zoom Level: {{ selectedWidget.config.zoom || 13 }}</label>
                  <input type="range" min="3" max="19" step="1" [(ngModel)]="selectedWidget.config.zoom" class="slider-control" />
                </div>
                <div class="form-group">
                  <label>Map View Type</label>
                  <select [(ngModel)]="selectedWidget.config.mapType" class="input-control">
                    <option value="m">Roadmap (Standard)</option>
                    <option value="k">Satellite Aerial</option>
                  </select>
                </div>
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" [(ngModel)]="selectedWidget.config.showTraffic" /> Show Live Traffic Indicator Badge
                </label>
              </div>
            </ng-container>

            <ng-container *ngIf="selectedWidget.type === 'slack'">
              <div class="form-group">
                <label>Slack Channel Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.channelName" placeholder="announcements" class="input-control" />
              </div>
              <div class="form-group">
                <label>Workspace / Team Name</label>
                <input type="text" [(ngModel)]="selectedWidget.config.workspaceName" placeholder="Acme Workspace" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Max Messages Shown</label>
                  <input type="number" min="1" max="15" [(ngModel)]="selectedWidget.config.maxMessages" class="input-control" />
                </div>
                <div class="form-group checkbox-group" style="margin-top: 24px;">
                  <label>
                    <input type="checkbox" [(ngModel)]="selectedWidget.config.showAvatars" /> Show User Avatars
                  </label>
                </div>
              </div>
            </ng-container>

            <ng-container *ngIf="selectedWidget.type === 'gmail'">
              <div class="form-group">
                <label>Google / Gmail Account</label>
                <input type="text" [(ngModel)]="selectedWidget.config.emailAddress" placeholder="user@gmail.com" class="input-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Unread Badge Count</label>
                  <input type="number" min="0" [(ngModel)]="selectedWidget.config.unreadCount" class="input-control" />
                </div>
                <div class="form-group checkbox-group" style="margin-top: 24px;">
                  <label>
                    <input type="checkbox" [(ngModel)]="selectedWidget.config.showSnippet" /> Show Subject & Snippet Previews
                  </label>
                </div>
              </div>
            </ng-container>

            <!-- TradingView Interactive Financial Charts -->
            <ng-container *ngIf="selectedWidget.type === 'tradingview'">
              <div class="form-group">
                <label>Symbol / Ticker</label>
                <input type="text" [(ngModel)]="selectedWidget.config.symbol" placeholder="NASDAQ:AAPL, BINANCE:BTCUSDT" class="input-control" />
                <span class="field-hint" style="font-size: 0.75rem; color: #94a3b8;">Supports stocks, crypto, forex, indices (e.g. NASDAQ:AAPL, BINANCE:BTCUSDT, FX:EURUSD, SPY)</span>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Chart Interval</label>
                  <select [(ngModel)]="selectedWidget.config.interval" class="input-control">
                    <option value="1">1 Minute</option>
                    <option value="5">5 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="1D">1 Day (Daily)</option>
                    <option value="1W">1 Week</option>
                    <option value="1M">1 Month</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Color Theme</label>
                  <select [(ngModel)]="selectedWidget.config.theme" class="input-control">
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Chart Style</label>
                  <select [(ngModel)]="selectedWidget.config.chartStyle" class="input-control">
                    <option value="1">Candlesticks</option>
                    <option value="2">Line Chart</option>
                    <option value="3">Area Chart</option>
                    <option value="8">Heikin Ashi</option>
                  </select>
                </div>
                <div class="form-group checkbox-group" style="margin-top: 24px;">
                  <label>
                    <input type="checkbox" [(ngModel)]="selectedWidget.config.showVolume" /> Show Volume Indicator
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Custom Title (Optional)</label>
                <input type="text" [(ngModel)]="selectedWidget.config.title" placeholder="e.g. Tech Portfolio, Bitcoin Tracker" class="input-control" />
              </div>
            </ng-container>

            <!-- Reddit Curated Photography & Media Feed -->
            <ng-container *ngIf="selectedWidget.type === 'reddit'">
              <div class="form-group">
                <label>Subreddit</label>
                <div style="display: flex; gap: 8px;">
                  <span style="display: flex; align-items: center; color: #94a3b8; font-weight: 600;">r/</span>
                  <input type="text" [(ngModel)]="selectedWidget.config.subreddit" placeholder="EarthPorn, space, wallpapers, aww" class="input-control" />
                </div>
                <span class="field-hint" style="font-size: 0.75rem; color: #94a3b8;">Curated suggestions: EarthPorn, space, CityPorn, wallpapers, art, aww, ITAP</span>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Sort Feed By</label>
                  <select [(ngModel)]="selectedWidget.config.sort" class="input-control">
                    <option value="hot">🔥 Hot Posts</option>
                    <option value="top">⭐ Top Rated</option>
                    <option value="new">✨ New Posts</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Slide Interval (Seconds)</label>
                  <input type="number" min="5" max="300" [(ngModel)]="selectedWidget.config.intervalSeconds" class="input-control" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" [(ngModel)]="selectedWidget.config.showScore" /> Show Upvote Count
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" [(ngModel)]="selectedWidget.config.showTitle" /> Show Post Title & Author
                  </label>
                </div>
              </div>
            </ng-container>

            <hr class="divider" />

            <!-- Phase 3: Linked Widget Interaction -->
            <div class="form-group">
              <label>🔗 Linked Target Widget</label>
              <select [(ngModel)]="selectedWidget.linkedWidgetId" class="input-control">
                <option [ngValue]="undefined">None (Standalone Widget)</option>
                <option *ngFor="let other of getOtherWidgets(selectedWidget)" [ngValue]="other.id">
                  #{{ other.id }} - {{ other.type | titlecase }} ({{ other.position.width }}×{{ other.position.height }})
                </option>
              </select>
              <span class="field-hint" style="font-size: 0.75rem; color: #94a3b8; display: block; margin-top: 4px;">Pair this widget with another widget on canvas for synchronized interaction or updates.</span>
            </div>

            <hr class="divider" />

            <!-- Phase 3: Rules Engine / Conditional Formatting -->
            <div class="rules-card">
              <div class="rules-header">
                <label style="font-weight: 600; color: #f1f5f9; margin: 0;">⚡ Conditional Alert Rules</label>
                <button type="button" class="btn-secondary-small" (click)="addRuleToSelectedWidget()">+ Add Rule</button>
              </div>
              <p class="tab-desc" style="margin-bottom: 8px;">Apply glowing neon alerts, borders, and pulse animations when data thresholds trigger.</p>

              <div *ngIf="!selectedWidget.rules || selectedWidget.rules.length === 0" style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 4px 0;">
                No rules active on this widget.
              </div>

              <div *ngFor="let rule of selectedWidget.rules; let ri = index" class="rule-item">
                <button type="button" class="rule-delete-btn" (click)="removeRuleFromSelectedWidget(ri)" title="Delete Rule">✕</button>
                <div class="form-row" style="margin-bottom: 6px;">
                  <div class="form-group" style="flex: 1;">
                    <label style="font-size: 0.72rem;">Field</label>
                    <input type="text" [(ngModel)]="rule.field" placeholder="value / temp / state" class="input-control" style="font-size: 0.75rem; padding: 4px 6px;" />
                  </div>
                  <div class="form-group" style="width: 70px;">
                    <label style="font-size: 0.72rem;">Condition</label>
                    <select [(ngModel)]="rule.operator" class="input-control" style="font-size: 0.75rem; padding: 4px 2px;">
                      <option value="gt">&gt;</option>
                      <option value="lt">&lt;</option>
                      <option value="eq">==</option>
                      <option value="neq">!=</option>
                      <option value="contains">has</option>
                    </select>
                  </div>
                  <div class="form-group" style="flex: 1;">
                    <label style="font-size: 0.72rem;">Threshold</label>
                    <input type="text" [(ngModel)]="rule.threshold" placeholder="e.g. 80" class="input-control" style="font-size: 0.75rem; padding: 4px 6px;" />
                  </div>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label style="font-size: 0.72rem;">Alert Visual Effect</label>
                  <select [(ngModel)]="rule.className" class="input-control" style="font-size: 0.75rem; padding: 4px 6px;">
                    <option value="alert-glow-red">🔴 Alert Red (Flashing Crimson Glow)</option>
                    <option value="alert-glow-amber">🟡 Warning Amber (Flashing Amber)</option>
                    <option value="highlight-green">🟢 Highlight Green (Emerald Glow)</option>
                    <option value="pulse-border">🔵 Pulse Border (Pulsing Neon)</option>
                  </select>
                </div>
              </div>
            </div>

            <hr class="divider" />

            <button (click)="removeSelectedWidget()" class="btn btn-danger">Delete Widget</button>
          </div>
        </div>

        <!-- TAB: LAYERS & Z-INDEX -->
        <div *ngIf="activeTab === 'layers'" class="tab-content">
          <div class="layers-header">
            <h3>Canvas Layers</h3>
            <span class="layers-count">{{ pageWidgets.length }} widgets</span>
          </div>
          <p class="tab-desc">Manage z-index stacking order, rename layers, lock positions, and toggle visibility on canvas.</p>

          <div *ngIf="pageWidgets.length === 0" class="empty-layers">
            <span>No widgets on this page yet.</span>
          </div>

          <div class="layers-list" *ngIf="pageWidgets.length > 0">
            <div 
              *ngFor="let w of pageWidgetsReversed; let i = index" 
              class="layer-item"
              [class.selected]="selectedWidget === w"
              [class.locked]="w.locked"
              [class.hidden-layer]="w.hidden"
              (click)="selectWidget(w, $event)"
            >
              <div class="layer-drag-order">
                <button 
                  type="button"
                  class="btn-layer-order" 
                  [disabled]="i === 0" 
                  (click)="moveLayerUp(w, $event)" 
                  title="Bring Forward (Higher Z-Index)"
                >▲</button>
                <button 
                  type="button"
                  class="btn-layer-order" 
                  [disabled]="i === pageWidgetsReversed.length - 1" 
                  (click)="moveLayerDown(w, $event)" 
                  title="Send Backward (Lower Z-Index)"
                >▼</button>
              </div>

              <div class="layer-info">
                <div class="layer-type-row">
                  <span class="layer-type-tag">{{ w.type }}</span>
                  <span *ngIf="w.schedule?.enabled" class="layer-sched-tag" title="Active Schedule Configured">🕒</span>
                </div>
                <input 
                  type="text" 
                  [(ngModel)]="w.customName" 
                  [placeholder]="getWidgetTypeLabel(w.type)" 
                  (click)="$event.stopPropagation()"
                  class="layer-name-input"
                />
              </div>

              <div class="layer-actions">
                <button 
                  type="button"
                  class="btn-layer-action" 
                  [class.active]="w.locked" 
                  (click)="toggleWidgetLock(w, $event)" 
                  [title]="w.locked ? 'Unlock Widget' : 'Lock Widget'"
                >
                  {{ w.locked ? '🔒' : '🔓' }}
                </button>
                <button 
                  type="button"
                  class="btn-layer-action" 
                  [class.active]="w.hidden" 
                  (click)="toggleWidgetVisibility(w, $event)" 
                  [title]="w.hidden ? 'Show on canvas' : 'Hide from canvas'"
                >
                  {{ w.hidden ? '🕶️' : '👁️' }}
                </button>
                <button 
                  type="button"
                  class="btn-layer-action btn-del" 
                  (click)="deleteWidgetFromLayer(w, $event)" 
                  title="Delete Widget"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: PAGES MANAGER -->
        <div *ngIf="activeTab === 'pages'" class="tab-content">
          <h3>Multi-Screen Pages</h3>
          <p class="tab-desc">Auto-rotate between different dashboard layouts on a timed carousel or active time-of-day schedules.</p>

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

              <!-- Page Schedule Section -->
              <div class="page-schedule-box">
                <div class="page-schedule-header" (click)="togglePageSchedule(page)">
                  <span class="page-sched-label">⏰ Schedule Page</span>
                  <input type="checkbox" [checked]="page.schedule?.enabled" (click)="$event.stopPropagation(); togglePageSchedule(page)" />
                </div>
                <div *ngIf="page.schedule?.enabled" class="page-schedule-body">
                  <div class="form-row">
                    <div class="form-group">
                      <label>From</label>
                      <input type="time" [(ngModel)]="getOrCreatePageSchedule(page).startTime" class="input-control" />
                    </div>
                    <div class="form-group">
                      <label>Until</label>
                      <input type="time" [(ngModel)]="getOrCreatePageSchedule(page).endTime" class="input-control" />
                    </div>
                  </div>
                  <div class="days-pill-row mini">
                    <button 
                      *ngFor="let day of weekDays; let dIdx = index" 
                      type="button" 
                      class="day-pill"
                      [class.active]="isDaySelected(page.schedule, dIdx)"
                      (click)="toggleDay(page.schedule, dIdx)"
                    >
                      {{ day }}
                    </button>
                  </div>
                </div>
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
              <option value="landscape_720p">Landscape 720p (1280 × 720) - Standard HD</option>
              <option value="landscape_1080p">Landscape 1080p (1920 × 1080) - Full HD</option>
              <option value="landscape_1440p">Landscape 1440p (2560 × 1440) - 2K QHD (Your Monitor)</option>
              <option value="landscape_4k">Landscape 4K (3840 × 2160) - 4K Ultra HD</option>
              <option value="portrait_720p">Portrait 720p (720 × 1280) - Vertical HD</option>
              <option value="portrait_1080p">Portrait 1080p (1080 × 1920) - Vertical Full HD</option>
              <option value="portrait_1440p">Portrait 1440p (1440 × 2560) - Vertical 2K QHD</option>
              <option value="portrait_4k">Portrait 4K (2160 × 3840) - Vertical 4K</option>
              <option value="landscape_16_10">Landscape 16:10 (1920 × 1200) - Tablet</option>
              <option value="portrait_16_10">Portrait 16:10 (1200 × 1920) - Tablet</option>
              <option value="landscape_4_3">Landscape 4:3 (1600 × 1200) - iPad</option>
              <option value="portrait_4_3">Portrait 4:3 (1200 × 1600) - iPad</option>
              <option value="ultrawide">Ultrawide 21:9 (3440 × 1440)</option>
              <option value="freeform">Freeform (Custom Dimensions)</option>
            </select>
          </div>
          
          <div class="form-row" *ngIf="displayConfig.orientation === 'freeform'">
            <div class="form-group">
              <label>Custom Width (px)</label>
              <input type="number" [(ngModel)]="canvasWidth" (ngModelChange)="updateOrientation()" class="input-control" />
            </div>
            <div class="form-group">
              <label>Custom Height (px)</label>
              <input type="number" [(ngModel)]="canvasHeight" (ngModelChange)="updateOrientation()" class="input-control" />
            </div>
          </div>

          <div class="form-group">
            <label>Theme</label>
            <select [(ngModel)]="displayConfig.theme" class="input-control">
              <option value="dark">Dark Slate</option>
              <option value="light">Minimal Light</option>
              <option value="oled">True Black (OLED)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Typography & Font Family</label>
            <select [(ngModel)]="displayConfig.font_family" (ngModelChange)="onFontChange()" class="input-control font-picker-select">
              <option *ngFor="let font of availableFonts" [value]="font.id">
                {{ font.name }} ({{ font.sample }})
              </option>
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
                <label>Sleep At</label>
                <input type="time" [(ngModel)]="sleepSchedule.sleepTime" class="input-control" />
              </div>
              <div class="form-group">
                <label>Wake At</label>
                <input type="time" [(ngModel)]="sleepSchedule.wakeTime" class="input-control" />
              </div>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" [(ngModel)]="sleepSchedule.nightMode" /> Ambient Night Clock (Red Minimal Mode)
              </label>
            </div>
          </div>

          <hr class="divider" />

          <h4>⚠️ Severe Weather Auto-Alerts</h4>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="weatherAlertsEnabled" /> Screen-Wide Emergency Alert Banner
            </label>
          </div>
          <p class="tab-desc">Displays a prominent warning banner across the display when NWS or Open-Meteo detects severe weather.</p>
          
          <div class="form-group" *ngIf="weatherAlertsEnabled">
            <label>Broadcast / Test Weather Alert</label>
            <input 
              type="text" 
              [(ngModel)]="weatherAlertText" 
              (ngModelChange)="onWeatherAlertChange()"
              placeholder="e.g. Severe Thunderstorm Warning until 8:00 PM" 
              class="input-control" 
            />
            <div class="alert-preset-chips">
              <button type="button" class="btn-chip" (click)="setWeatherAlertPreset('⚡ Severe Thunderstorm Warning with 60mph gusts')">⚡ Thunderstorm</button>
              <button type="button" class="btn-chip" (click)="setWeatherAlertPreset('🌪️ Tornado Watch issued for region until 10 PM')">🌪️ Tornado</button>
              <button type="button" class="btn-chip" (click)="setWeatherAlertPreset('🌊 Flash Flood Warning: Move to higher ground')">🌊 Flood</button>
              <button type="button" class="btn-chip" (click)="clearWeatherAlert()">✕ Clear</button>
            </div>
          </div>

          <hr class="divider" />

          <h4>Brand & Organization Logo</h4>
          <div class="form-group">
            <label>Brand Logo Image URL</label>
            <input type="text" [(ngModel)]="logoUrl" placeholder="https://yourdomain.com/logo.png" class="input-control" />
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="showLogoKiosk" /> Show Logo Watermark on Kiosk Wall Screen
            </label>
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
              <option value="video">Direct Video (.mp4)</option>
              <option value="youtube">YouTube Ambient Stream</option>
            </select>
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'image' || backgroundConfig.type === 'color' || backgroundConfig.type === 'gradient'">
            <label>Value (URL / Hex / CSS)</label>
            <input type="text" [(ngModel)]="backgroundConfig.value" placeholder="https://... or #000000" class="input-control" />
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'video'">
            <label>Video URL (.mp4 / .webm)</label>
            <input type="text" [(ngModel)]="backgroundConfig.videoUrl" placeholder="https://assets.mixkit.co/videos/preview/..." class="input-control" />
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'youtube'">
            <label>YouTube Video / Stream ID</label>
            <input type="text" [(ngModel)]="backgroundConfig.youtubeId" placeholder="jfKfPfyJRdk" class="input-control" />
          </div>

          <div class="form-group" *ngIf="backgroundConfig.type === 'image' || backgroundConfig.type === 'unsplash' || backgroundConfig.type === 'video' || backgroundConfig.type === 'youtube'">
            <label>Blur ({{ backgroundConfig.blur || 0 }}px)</label>
            <input type="range" min="0" max="20" step="1" [(ngModel)]="backgroundConfig.blur" class="slider-control" />
          </div>

          <hr class="divider" />

          <h4>🔔 Audio Chimes & Sound Synthesis</h4>
          <p class="tab-desc">Synthesized browser audio chimes for calendar events and hourly wall clock gongs (no external sound files required).</p>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="audioChimesEnabled" /> Play Event Chimes (Plays subtle marimba tone on calendar event start)
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="hourlyChime" /> Hourly Clock Chime (Plays acoustic gong on top of each hour)
            </label>
          </div>

          <div class="form-group">
            <label>Audition Chimes:</label>
            <div class="chime-test-row">
              <button type="button" class="btn-chip" (click)="testChime('doorbell')">🔔 Doorbell</button>
              <button type="button" class="btn-chip" (click)="testChime('marimba')">🎵 Marimba</button>
              <button type="button" class="btn-chip" (click)="testChime('gong')">🕰️ Hourly Gong</button>
              <button type="button" class="btn-chip" (click)="testChime('alert')">⚠️ Alert Beep</button>
            </div>
          </div>

          <hr class="divider" />

          <h4>📱 TouchHub Navigation Dock</h4>
          <p class="tab-desc">Floating touch navigation dock on kiosk screens for switching pages, quick drawing whiteboard, task lists, and sleep toggle.</p>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="displayConfig.touchhub_enabled" /> Enable TouchHub Dock on Kiosk
            </label>
          </div>
          <div *ngIf="displayConfig.touchhub_enabled">
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" [(ngModel)]="touchHubAutoHide" (ngModelChange)="onTouchHubConfigChange()" /> Auto-hide after inactivity (4s)
                </label>
              </div>
              <div class="form-group">
                <label>Dock Position</label>
                <select [(ngModel)]="touchHubPosition" (ngModelChange)="onTouchHubConfigChange()" class="input-control">
                  <option value="bottom">Bottom Edge (Recommended)</option>
                  <option value="top">Top Edge</option>
                </select>
              </div>
            </div>
          </div>

          <hr class="divider" />

          <h4>🎨 Custom CSS Overrides</h4>
          <p class="tab-desc">Inject custom CSS directly into your kiosk viewer for bespoke styling, typography, glow effects, or component layout tweaks.</p>
          <div class="form-group">
            <textarea 
              [(ngModel)]="customCss" 
              placeholder="/* Example: Custom widget border or glow */&#10;.widget-card { border-color: rgba(56, 189, 248, 0.4) !important; }" 
              class="custom-css-area"
            ></textarea>
          </div>
        </div>

        <div class="actions">
          <button (click)="saveConfiguration()" [disabled]="saving" class="btn btn-primary">
            {{ saving ? 'Saving...' : 'Save & Publish' }}
          </button>
          
          <div class="export-actions">
            <button (click)="exportConfiguration()" class="btn-secondary-small">Export JSON</button>
            <label class="btn-secondary-small">
              Import JSON
              <input type="file" accept=".json" (change)="importConfiguration($event)" style="display: none;" />
            </label>
          </div>
        </div>
      </aside>

      <!-- Visual Canvas Viewport with Auto-Zoom Stage -->
      <main class="canvas-viewport" id="editorViewport" (click)="selectedWidget = null">
        <!-- Floating Canvas Power Toolbar (Undo, Redo, Duplication, Alignment) -->
        <div class="canvas-power-toolbar" (click)="$event.stopPropagation()">
          <div class="power-tool-group">
            <button (click)="undo()" [disabled]="!canUndo()" class="power-btn" title="Undo (Ctrl+Z / ⌘Z)">
              <span>↩</span> Undo
            </button>
            <button (click)="redo()" [disabled]="!canRedo()" class="power-btn" title="Redo (Ctrl+Y / ⌘Y)">
              <span>↪</span> Redo
            </button>
          </div>

          <div class="power-divider" *ngIf="selectedWidget"></div>

          <!-- Selection & Alignment Tools -->
          <div class="power-tool-group" *ngIf="selectedWidget">
            <button (click)="duplicateSelectedWidget()" class="power-btn" title="Duplicate Widget (Ctrl+D / ⌘D)">
              <span>📋</span> Duplicate
            </button>
            <button (click)="alignSelectedWidget('left')" class="power-btn" title="Align Left">
              <span>⇤</span>
            </button>
            <button (click)="alignSelectedWidget('center_h')" class="power-btn" title="Center Horizontally">
              <span>↔</span>
            </button>
            <button (click)="alignSelectedWidget('right')" class="power-btn" title="Align Right">
              <span>⇥</span>
            </button>
            <button (click)="alignSelectedWidget('top')" class="power-btn" title="Align Top">
              <span>⤒</span>
            </button>
            <button (click)="alignSelectedWidget('center_v')" class="power-btn" title="Center Vertically">
              <span>↕</span>
            </button>
            <button (click)="alignSelectedWidget('bottom')" class="power-btn" title="Align Bottom">
              <span>⤓</span>
            </button>
            <button (click)="removeSelectedWidget()" class="power-btn power-btn-danger" title="Delete Widget (Delete)">
              <span>🗑️</span>
            </button>
          </div>

          <div class="selected-coord-pill" *ngIf="selectedWidget">
            X: {{ selectedWidget.position.x }} · Y: {{ selectedWidget.position.y }} | {{ selectedWidget.position.width }}×{{ selectedWidget.position.height }}
          </div>
        </div>

        <div class="canvas-stage" [style.width.px]="canvasWidth * zoomLevel" [style.height.px]="canvasHeight * zoomLevel">
          <div 
            class="screen-canvas" 
            [ngClass]="[displayConfig.theme, displayConfig.orientation || 'landscape_720p', gridSnapSize > 0 ? 'grid-overlay-' + gridSnapSize : '']" 
            [style.width.px]="canvasWidth"
            [style.height.px]="canvasHeight"
            [style.transform]="'scale(' + zoomLevel + ')'"
            [style.background]="getCanvasBackgroundStyle()"
            [style.fontFamily]="canvasFontFamily"
            (click)="$event.stopPropagation()"
          >
            <!-- Background image layer -->
            <div 
              *ngIf="getCanvasBackgroundImage()" 
              class="editor-bg-image" 
              [style.backgroundImage]="'url(' + getCanvasBackgroundImage() + ')'"
              [style.filter]="'blur(' + (backgroundConfig.blur || 0) + 'px)'"
            ></div>

            <!-- Background video layer -->
            <video 
              *ngIf="backgroundConfig.type === 'video' && backgroundConfig.videoUrl" 
              class="editor-bg-video" 
              [src]="backgroundConfig.videoUrl"
              autoplay muted loop playsinline
              [style.filter]="'blur(' + (backgroundConfig.blur || 0) + 'px)'"
            ></video>

            <!-- Background youtube layer -->
            <iframe 
              *ngIf="backgroundConfig.type === 'youtube' && backgroundConfig.youtubeId" 
              class="editor-bg-youtube" 
              [src]="getSafeYoutubeUrl(backgroundConfig.youtubeId)"
              frameborder="0"
              [style.filter]="'blur(' + (backgroundConfig.blur || 0) + 'px)'"
            ></iframe>

            <!-- Severe Weather Banner Preview in Editor Canvas -->
            <app-severe-weather-alert-banner 
              *ngIf="weatherAlertText" 
              [alert]="getEditorWeatherAlert()" 
              [dismissable]="false"
            ></app-severe-weather-alert-banner>

            <div 
              *ngFor="let widget of pageWidgets; let i = index"
              class="draggable-widget"
              [class.selected]="selectedWidget === widget"
              [class.widget-locked]="widget.locked"
              [class.widget-hidden]="widget.hidden"
              [style.left.px]="widget.position.x"
              [style.top.px]="widget.position.y"
              [style.width.px]="widget.position.width"
              [style.height.px]="widget.position.height"
              [style.opacity]="widget.hidden ? 0.35 : (widget.style?.opacity !== undefined ? widget.style?.opacity : 1)"
              [style.border-radius.px]="widget.style?.borderRadius !== undefined ? widget.style?.borderRadius : 12"
              [style.fontFamily]="getWidgetFont(widget)"
              (mousedown)="startDrag($event, widget)"
              (click)="selectWidget(widget, $event)"
            >
              <!-- Live Position HUD Badge on Selected Widget -->
              <div class="live-pos-hud" *ngIf="selectedWidget === widget">
                X: {{ widget.position.x }}, Y: {{ widget.position.y }} | {{ widget.position.width }}×{{ widget.position.height }}
              </div>

              <div class="widget-header">
                <span class="widget-badge">
                  {{ widget.customName || (widget.type | uppercase) }}
                  <span *ngIf="widget.locked" class="badge-icon-tag" title="Layer is Locked">🔒</span>
                  <span *ngIf="widget.hidden" class="badge-icon-tag" title="Hidden on Canvas">🕶️</span>
                  <span *ngIf="widget.schedule?.enabled" class="badge-icon-tag" title="Active Schedule Configured">🕒</span>
                </span>
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
                <app-radar-widget *ngIf="widget.type === 'radar'" [config]="widget.config"></app-radar-widget>
                <app-quote-widget *ngIf="widget.type === 'quote'" [config]="widget.config"></app-quote-widget>
                <app-ai-briefing-widget *ngIf="widget.type === 'ai_briefing'" [config]="widget.config"></app-ai-briefing-widget>
                <app-chores-widget *ngIf="widget.type === 'chores'" [config]="widget.config"></app-chores-widget>
                <app-camera-pip-widget *ngIf="widget.type === 'camera_pip'" [config]="widget.config"></app-camera-pip-widget>
                <app-commute-widget *ngIf="widget.type === 'commute'" [config]="widget.config"></app-commute-widget>
                <app-youtube-widget *ngIf="widget.type === 'youtube'" [config]="widget.config"></app-youtube-widget>
                <app-text-widget *ngIf="widget.type === 'text'" [config]="widget.config"></app-text-widget>
                <app-qrcode-widget *ngIf="widget.type === 'qrcode'" [config]="widget.config"></app-qrcode-widget>
                <app-world-clocks-widget *ngIf="widget.type === 'world_clocks'" [config]="widget.config"></app-world-clocks-widget>
                <app-shapes-widget *ngIf="widget.type === 'shapes'" [config]="widget.config"></app-shapes-widget>
                <app-scheduled-text-widget *ngIf="widget.type === 'scheduled_text'" [config]="widget.config"></app-scheduled-text-widget>
                <app-button-widget *ngIf="widget.type === 'button'" [config]="widget.config"></app-button-widget>
                <app-sun-moon-widget *ngIf="widget.type === 'sun_moon'" [config]="widget.config"></app-sun-moon-widget>
                <app-analog-clock-widget *ngIf="widget.type === 'analog_clock'" [config]="widget.config"></app-analog-clock-widget>
                <app-rest-fetch-widget *ngIf="widget.type === 'rest_fetch'" [config]="widget.config"></app-rest-fetch-widget>
                <app-gauge-widget *ngIf="widget.type === 'gauge'" [config]="widget.config"></app-gauge-widget>
                <app-google-maps-widget *ngIf="widget.type === 'google_maps'" [config]="widget.config"></app-google-maps-widget>
                <app-whiteboard-widget *ngIf="widget.type === 'whiteboard'" [config]="widget.config"></app-whiteboard-widget>
                <app-slack-widget *ngIf="widget.type === 'slack'" [config]="widget.config"></app-slack-widget>
                <app-gmail-widget *ngIf="widget.type === 'gmail'" [config]="widget.config"></app-gmail-widget>
                <app-tradingview-widget *ngIf="widget.type === 'tradingview'" [config]="widget.config"></app-tradingview-widget>
                <app-reddit-widget *ngIf="widget.type === 'reddit'" [config]="widget.config"></app-reddit-widget>
              </div>

              <!-- 8-Point Visual Resize Handles -->
              <ng-container *ngIf="selectedWidget === widget && !widget.locked">
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
        </div>

        <!-- Floating Viewport Zoom Toolbar -->
        <div class="floating-zoom-bar" (click)="$event.stopPropagation()">
          <span class="zoom-res-indicator">{{ canvasWidth }} × {{ canvasHeight }}</span>
          <div class="zoom-btn-group">
            <button (click)="zoomOut()" class="zoom-btn" title="Zoom Out">−</button>
            <button (click)="toggleAutoFit()" class="zoom-btn zoom-fit-btn" [class.active]="autoFit" title="Auto-fit Canvas to Viewport">
              {{ autoFit ? 'Fit (' + Math.round(zoomLevel * 100) + '%)' : Math.round(zoomLevel * 100) + '%' }}
            </button>
            <button (click)="zoomIn()" class="zoom-btn" title="Zoom In">+</button>
            <button (click)="setZoom(0.5)" [class.active]="zoomLevel === 0.5 && !autoFit" class="zoom-btn">50%</button>
            <button (click)="setZoom(0.75)" [class.active]="zoomLevel === 0.75 && !autoFit" class="zoom-btn">75%</button>
            <button (click)="setZoom(1.0)" [class.active]="zoomLevel === 1.0 && !autoFit" class="zoom-btn">100%</button>
          </div>
        </div>
      </main>

      <!-- Help & Documentation Modal -->
      <app-help-docs-modal *ngIf="showHelpModal" (closed)="showHelpModal = false"></app-help-docs-modal>

      <!-- Auto Arrange Layout Picker Modal -->
      <div class="auto-arrange-overlay" *ngIf="showAutoArrangeModal" (click)="showAutoArrangeModal = false">
        <div class="auto-arrange-modal" (click)="$event.stopPropagation()">
          <div class="auto-arrange-header">
            <div>
              <h2>✨ Auto Arrange Layouts</h2>
              <p class="auto-arrange-subtitle">Choose a layout style for your {{ pageWidgets.length }} widgets</p>
            </div>
            <button class="auto-arrange-close" (click)="showAutoArrangeModal = false">✕</button>
          </div>

          <div class="layout-grid">
            <div 
              *ngFor="let layout of layoutPreviews; let i = index"
              class="layout-card"
              [class.selected]="selectedLayoutIndex === i"
              (click)="selectedLayoutIndex = i"
            >
              <div class="layout-preview-canvas" [style.aspect-ratio]="canvasWidth + '/' + canvasHeight">
                <div 
                  *ngFor="let pos of layout.positions; let j = index"
                  class="layout-preview-widget"
                  [style.left.%]="(pos.x / canvasWidth) * 100"
                  [style.top.%]="(pos.y / canvasHeight) * 100"
                  [style.width.%]="(pos.width / canvasWidth) * 100"
                  [style.height.%]="(pos.height / canvasHeight) * 100"
                  [style.background]="layoutColorPalette[j % layoutColorPalette.length]"
                >
                  <span class="preview-widget-label">{{ pageWidgets[j] ? pageWidgets[j].type : '' }}</span>
                </div>
              </div>
              <div class="layout-card-footer">
                <span class="layout-card-icon">{{ layout.icon }}</span>
                <div>
                  <div class="layout-card-name">{{ layout.name }}</div>
                  <div class="layout-card-desc">{{ layout.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="auto-arrange-actions">
            <button 
              class="btn btn-primary" 
              [disabled]="selectedLayoutIndex < 0"
              (click)="applySelectedLayout()"
            >
              Apply Layout
            </button>
            <button class="btn btn-secondary" (click)="showAutoArrangeModal = false">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Starter Templates Gallery Modal -->
      <div class="templates-overlay" *ngIf="showTemplatesModal" (click)="showTemplatesModal = false">
        <div class="templates-modal" (click)="$event.stopPropagation()">
          <div class="templates-header">
            <div>
              <h2>🎨 Starter Dashboard Templates</h2>
              <p class="templates-subtitle">Jumpstart your display with pre-built, pixel-perfect curated layouts</p>
            </div>
            <button type="button" class="templates-close" (click)="showTemplatesModal = false">✕</button>
          </div>

          <div class="templates-grid">
            <div 
              *ngFor="let tmpl of dashboardTemplates" 
              class="template-card"
              [style.border-top-color]="tmpl.accentColor"
            >
              <div class="template-card-top">
                <div class="template-badge-pill" [style.backgroundColor]="tmpl.accentColor">{{ tmpl.badge }}</div>
                <div class="template-icon-large">{{ tmpl.icon }}</div>
                <h3 class="template-title">{{ tmpl.name }}</h3>
                <span class="template-cat">{{ tmpl.category }}</span>
              </div>

              <p class="template-description">{{ tmpl.description }}</p>

              <div class="template-actions">
                <button 
                  type="button" 
                  class="btn-tmpl-apply" 
                  (click)="applyTemplateToCurrentPage(tmpl)"
                  title="Replace widgets on the active page with this template"
                >
                  ⚡ Apply to This Page
                </button>
                <button 
                  type="button" 
                  class="btn-tmpl-new-page" 
                  (click)="applyTemplateAsNewPage(tmpl)"
                  title="Create a new page and populate with this template"
                >
                  ➕ Add as New Page
                </button>
              </div>
            </div>
          </div>

          <div class="templates-footer">
            <button type="button" class="btn btn-secondary" (click)="showTemplatesModal = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      background-color: #090d16;
      color: #f1f5f9;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      overflow: hidden;
    }
    .sidebar {
      width: 400px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      box-sizing: border-box;
      overflow-y: auto;
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
      z-index: 20;
    }
    .user-profile-bar {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.4);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-back-fleet {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #38bdf8;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .btn-back-fleet:hover {
      background: rgba(14, 165, 233, 0.2);
      color: #fff;
    }
    .btn-help-mini {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-help-mini:hover {
      background: #0ea5e9;
      color: #ffffff;
    }
    .btn-guide-mini {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-guide-mini:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .user-info {
      margin-left: auto;
    }
    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .admin-brand-card {
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-slot-preview {
      width: 50px;
      height: 50px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .brand-slot-preview:hover {
      border-color: #0ea5e9;
      background: rgba(14, 165, 233, 0.1);
    }
    .brand-slot-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .brand-slot-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo-text-ph {
      font-size: 0.6rem;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.5px;
    }
    .logo-sub-ph {
      font-size: 0.5rem;
      color: #64748b;
    }
    .brand-display-meta {
      overflow: hidden;
    }
    .display-title-heading {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .res-tag {
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.4);
      flex-shrink: 0;
    }
    .user-email {
      font-size: 0.8rem;
      color: #cbd5e1;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-signout {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-signout:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ffffff;
    }
    .sidebar-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 6px 12px;
      gap: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sidebar-tabs button {
      flex: 1;
      padding: 8px 10px;
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sidebar-tabs button:hover {
      color: #ffffff;
    }
    .sidebar-tabs button.active {
      color: #ffffff;
      background: #0ea5e9;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }
    .tab-content {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    .tab-desc {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: -6px;
    }
    .divider {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin: 10px 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #f1f5f9;
      text-transform: none;
    }
    .form-row {
      display: flex;
      gap: 10px;
    }
    .form-row .form-group {
      flex: 1;
    }
    .input-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .input-control:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
    .grid-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .pill-group {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 2px;
    }
    .pill-group button {
      background: none;
      border: none;
      color: #94a3b8;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-group button.active {
      background: #0ea5e9;
      color: #ffffff;
    }

    .palette-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .palette-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .palette-badge {
      font-size: 0.65rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 8px;
      border-radius: 10px;
    }
    .widget-palette {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .palette-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(14, 165, 233, 0.4);
      transform: translateY(-1px);
    }
    .palette-icon {
      font-size: 1.05rem;
    }
    .palette-title {
      font-size: 0.78rem;
    }

    .btn {
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
      width: 100%;
      padding: 12px;
      font-size: 0.95rem;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 6px 16px rgba(14, 165, 233, 0.6);
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      width: 100%;
      margin-top: 10px;
      padding: 8px;
      border-radius: 8px;
    }
    .btn-danger:hover {
      background: #dc2626;
      color: #ffffff;
    }

    .inspector {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .inspector-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .dimension-tag {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-family: monospace;
      color: #38bdf8;
    }

    .pages-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .page-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 12px;
      transition: all 0.2s;
    }
    .page-item.selected {
      border-color: #0ea5e9;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
    }
    .page-top {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .page-num {
      background: #0ea5e9;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      width: 22px;
      height: 22px;
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
      color: #94a3b8;
    }
    .duration-input {
      width: 60px;
    }

    .section-subhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 8px 0 4px 0;
    }
    .btn-xs-action {
      background: #0ea5e9;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      cursor: pointer;
    }
    .btn-xs-action:hover { background: #0284c7; }

    .smart-home-guide-box {
      background: rgba(14, 165, 233, 0.08);
      border: 1px dashed rgba(14, 165, 233, 0.3);
      border-radius: 8px;
      padding: 8px 10px;
      margin: 8px 0;
      font-size: 0.72rem;
    }
    .smart-home-guide-box strong {
      color: #38bdf8;
      display: block;
      margin-bottom: 2px;
    }
    .smart-home-guide-box p {
      color: #94a3b8;
      margin: 0;
      line-height: 1.35;
    }

    .quick-tags-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }
    .quick-tag-label {
      font-size: 0.65rem;
      color: #64748b;
      font-weight: 600;
    }
    .tag-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #38bdf8;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tag-pill:hover {
      background: #0ea5e9;
      color: #ffffff;
      border-color: #0ea5e9;
    }

    .radar-notice-banner {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.72rem;
      color: #a7f3d0;
      line-height: 1.35;
    }
    .radar-notice-icon {
      font-size: 1rem;
    }

    .weather-notice-banner {
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.72rem;
      color: #7dd3fc;
      line-height: 1.35;
    }
    .weather-notice-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

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
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px;
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
    .btn-icon-danger {
      background: none;
      border: none;
      color: #f87171;
      font-size: 1rem;
      cursor: pointer;
    }

    .actions {
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: #0f172a;
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .export-actions {
      display: flex;
      gap: 8px;
    }
    .btn-secondary-small {
      flex: 1;
      padding: 6px 0;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
    }
    .btn-secondary-small:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .canvas-viewport {
      flex: 1;
      height: 100vh;
      box-sizing: border-box;
      padding: 32px 32px 80px 32px;
      display: flex;
      background: #070b12;
      overflow: auto;
      position: relative;
    }
    .canvas-stage {
      position: relative;
      margin: auto;
      flex-shrink: 0;
      box-sizing: border-box;
      transition: width 0.2s ease, height 0.2s ease;
    }
    .screen-canvas {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      background: #000;
      border: 10px solid #1e293b;
      border-radius: 20px;
      box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      transform-origin: 0 0;
      transition: transform 0.2s ease;
    }

    .canvas-power-toolbar {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(14px);
      border-radius: 12px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 50;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .power-tool-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .power-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .power-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-color: rgba(56, 189, 248, 0.4);
    }
    .power-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .power-btn-danger:hover {
      background: rgba(239, 68, 68, 0.25) !important;
      color: #f87171 !important;
      border-color: rgba(239, 68, 68, 0.5) !important;
    }
    .power-divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.12);
      margin: 0 2px;
    }
    .selected-coord-pill {
      font-size: 0.68rem;
      font-family: monospace;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .live-pos-hud {
      position: absolute;
      top: -24px;
      left: 0;
      background: #0284c7;
      color: #ffffff;
      font-size: 0.62rem;
      font-weight: 800;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      z-index: 30;
    }

    .floating-zoom-bar {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
      padding: 6px 16px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100;
    }
    .zoom-res-indicator {
      font-size: 0.75rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
      padding-right: 10px;
      border-right: 1px solid rgba(255, 255, 255, 0.12);
    }
    .zoom-btn-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .zoom-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .zoom-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .zoom-btn.active {
      background: #0ea5e9;
      color: #fff;
      border-color: #38bdf8;
    }
    .editor-bg-image {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      z-index: 0;
    }
    .editor-bg-video, .editor-bg-youtube {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
      pointer-events: none;
      z-index: 0;
    }

    /* Grid Snapping Matrix Overlays */
    .grid-overlay-10 {
      background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
      background-size: 10px 10px;
    }
    .grid-overlay-20 {
      background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .draggable-widget {
      position: absolute;
      cursor: move;
      border: 1px dashed rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      box-sizing: border-box;
      user-select: none;
      z-index: 1;
    }
    .draggable-widget.selected {
      border: 2px solid #0ea5e9;
      box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.3);
      z-index: 10;
    }
    .widget-header {
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      font-size: 0.65rem;
      padding: 3px 8px;
      letter-spacing: 0.5px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .widget-badge { font-weight: 700; color: #38bdf8; }
    .widget-size { color: #94a3b8; font-size: 0.6rem; }
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

    /* ==============================
       AUTO ARRANGE STYLES
       ============================== */
    .btn-auto-arrange {
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
    }
    .btn-auto-arrange:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    }
    .btn-auto-arrange:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .auto-arrange-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 9000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .auto-arrange-modal {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 90vw;
      max-width: 780px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .auto-arrange-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 24px 28px 12px;
    }
    .auto-arrange-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #f1f5f9;
    }
    .auto-arrange-subtitle {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .auto-arrange-close {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 1.1rem;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .auto-arrange-close:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 12px 28px 20px;
    }
    @media (max-width: 700px) {
      .layout-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .layout-card {
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
    }
    .layout-card:hover {
      border-color: rgba(99, 102, 241, 0.4);
      background: rgba(99, 102, 241, 0.08);
      transform: translateY(-2px);
    }
    .layout-card.selected {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.12);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    .layout-preview-canvas {
      position: relative;
      width: 100%;
      background: #0f172a;
      border-radius: 8px 8px 0 0;
      overflow: hidden;
      min-height: 80px;
    }

    .layout-preview-widget {
      position: absolute;
      border-radius: 4px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .preview-widget-label {
      font-size: 0.5rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      padding: 0 2px;
    }

    .layout-card-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
    }
    .layout-card-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .layout-card-name {
      font-size: 0.78rem;
      font-weight: 700;
      color: #e2e8f0;
    }
    .layout-card-desc {
      font-size: 0.65rem;
      color: #64748b;
      line-height: 1.3;
    }

    .auto-arrange-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 28px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
    }

    /* --- Block Layers Panel Styles --- */
    .layers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .layers-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .layers-count {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-weight: 600;
    }
    .empty-layers {
      padding: 28px 16px;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 10px;
    }
    .layers-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: calc(100vh - 280px);
      overflow-y: auto;
      padding-right: 2px;
    }
    .layer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 6px 10px;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .layer-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .layer-item.selected {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(14, 165, 233, 0.5);
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
    }
    .layer-item.locked {
      border-left: 3px solid #f59e0b;
    }
    .layer-item.hidden-layer {
      opacity: 0.45;
    }
    .layer-drag-order {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .btn-layer-order {
      width: 20px;
      height: 16px;
      padding: 0;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      color: #94a3b8;
      font-size: 0.55rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s;
    }
    .btn-layer-order:hover:not(:disabled) {
      background: rgba(14, 165, 233, 0.3);
      color: #38bdf8;
    }
    .btn-layer-order:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }
    .layer-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .layer-type-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .layer-type-tag {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #38bdf8;
    }
    .layer-sched-tag {
      font-size: 0.65rem;
    }
    .layer-name-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid transparent;
      color: #f8fafc;
      font-size: 0.82rem;
      padding: 1px 0;
      width: 100%;
      outline: none;
      transition: border-color 0.15s;
    }
    .layer-name-input:focus {
      border-bottom-color: #0ea5e9;
    }
    .layer-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .btn-layer-action {
      width: 28px;
      height: 28px;
      padding: 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      font-size: 0.78rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-layer-action:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .btn-layer-action.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.4);
    }
    .btn-layer-action.btn-del:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }

    /* --- Schedule Controls & Day Pills --- */
    .schedule-config-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      margin-top: 6px;
    }
    .schedule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .schedule-title-wrap {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .schedule-icon {
      font-size: 1rem;
    }
    .schedule-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .schedule-body {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .days-pill-row {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .days-pill-row.mini .day-pill {
      padding: 3px 6px;
      font-size: 0.65rem;
    }
    .day-pill {
      flex: 1;
      min-width: 32px;
      padding: 5px 6px;
      text-align: center;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
    }
    .day-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f8fafc;
    }
    .day-pill.active {
      background: #0ea5e9;
      color: #ffffff;
      border-color: #0ea5e9;
      box-shadow: 0 0 8px rgba(14, 165, 233, 0.4);
    }
    .day-presets {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .btn-preset-mini {
      padding: 2px 8px;
      font-size: 0.68rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-preset-mini:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    /* --- Layer Inspector Quick Toggles --- */
    .layer-quick-toggles {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .btn-layer-pill {
      flex: 1;
      padding: 6px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .btn-layer-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }
    .btn-layer-pill.active {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.4);
    }

    /* --- Page Schedule Box in Pages Tab --- */
    .page-schedule-box {
      margin-top: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 8px 10px;
    }
    .page-schedule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .page-sched-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .page-schedule-body {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* --- Canvas Widget Lock & Hidden States --- */
    .draggable-widget.widget-locked {
      cursor: not-allowed !important;
      border-color: rgba(245, 158, 11, 0.35) !important;
    }
    .draggable-widget.widget-hidden {
      border: 1px dashed rgba(255, 255, 255, 0.25) !important;
    }
    .badge-icon-tag {
      font-size: 0.7rem;
      margin-left: 4px;
    }

    /* --- Action Row & Templates Button --- */
    .layout-action-row {
      display: flex;
      gap: 8px;
    }
    .layout-action-row .btn-auto-arrange {
      flex: 1;
      margin: 0;
    }
    .btn-templates {
      flex: 1;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .btn-templates:hover {
      background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
      transform: translateY(-1px);
    }

    /* --- Alert Preset Chips --- */
    .alert-preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .btn-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #cbd5e1;
      padding: 3px 8px;
      font-size: 0.72rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-chip:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    /* --- Templates Modal --- */
    .templates-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: fadeIn 0.2s ease-out;
    }
    .templates-modal {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      width: 100%;
      max-width: 1100px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }
    .templates-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .templates-header h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .templates-subtitle {
      margin: 4px 0 0 0;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .templates-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .templates-close:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.1);
    }
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      padding: 24px 28px;
      overflow-y: auto;
      max-height: calc(90vh - 170px);
    }
    @media (max-width: 900px) {
      .templates-grid {
        grid-template-columns: 1fr;
      }
    }
    .template-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 4px solid var(--accent-color, #6366f1);
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .template-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
      border-color: rgba(255, 255, 255, 0.18);
    }
    .template-card-top {
      position: relative;
      margin-bottom: 12px;
    }
    .template-badge-pill {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      color: #fff;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .template-icon-large {
      font-size: 2.2rem;
      margin-bottom: 6px;
    }
    .template-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .template-cat {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 500;
    }
    .template-description {
      font-size: 0.82rem;
      color: #cbd5e1;
      line-height: 1.45;
      margin: 0 0 16px 0;
      flex: 1;
    }
    .template-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-tmpl-apply {
      width: 100%;
      padding: 9px 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-tmpl-apply:hover {
      background: #2563eb;
    }
    .btn-tmpl-new-page {
      width: 100%;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-tmpl-new-page:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .templates-footer {
      padding: 16px 28px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
    }
    .rules-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .rules-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .rule-item {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
      position: relative;
    }
    .rule-delete-btn {
      position: absolute;
      top: 4px;
      right: 6px;
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 0.95rem;
      cursor: pointer;
      line-height: 1;
    }
    .rule-delete-btn:hover {
      color: #f87171;
    }
    .custom-css-area {
      width: 100%;
      height: 130px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      padding: 8px;
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.4;
    }
    .custom-css-area:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .chime-test-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
  `]
})
export class DashboardEditorComponent implements OnInit, AfterViewInit {
  token: string = '';
  saving: boolean = false;
  activeTab: 'layout' | 'layers' | 'pages' | 'settings' = 'layout';
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  displayConfig: DisplayConfig = {
    id: 0,
    name: 'Smart Wall Display',
    theme: 'dark',
    orientation: 'landscape_720p',
    refresh_interval: 60
  };

  logoUrl: string = '';
  showLogoKiosk: boolean = false;

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

  // Gemini API Key Testing
  testingGemini: boolean = false;
  geminiTestResult: { success: boolean; message: string } | null = null;

  // Canvas Resolution Dimensions
  canvasWidth: number = 1280;
  canvasHeight: number = 720;

  // Viewport Zoom & Scaling
  zoomLevel: number = 0.75;
  autoFit: boolean = true;
  Math = Math;

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
  showHelpModal: boolean = false;

  // History & Undo/Redo State Stack
  private historyStack: string[] = [];
  private historyIndex: number = -1;
  private isApplyingHistory: boolean = false;

  // Auto Arrange State
  showAutoArrangeModal: boolean = false;
  selectedLayoutIndex: number = -1;
  layoutPreviews: { name: string; icon: string; description: string; positions: { x: number; y: number; width: number; height: number }[] }[] = [];
  layoutColorPalette: string[] = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6',
    '#e879f9', '#fb923c', '#a3e635', '#38bdf8', '#c084fc',
    '#fbbf24', '#34d399', '#f472b6', '#22d3ee', '#a78bfa'
  ];

  // Typography & Google Fonts
  availableFonts: FontOption[] = AVAILABLE_FONTS;

  // Starter Templates Gallery
  dashboardTemplates: DashboardTemplate[] = DASHBOARD_TEMPLATES;
  showTemplatesModal: boolean = false;

  // Severe Weather Alerts
  weatherAlertsEnabled: boolean = true;
  weatherAlertText: string = '';

  // Phase 3: Custom CSS and Audio Chimes
  customCss: string = '';
  audioChimesEnabled: boolean = false;
  hourlyChime: boolean = false;

  // Phase 4: TouchHub Navigation Dock
  touchHubAutoHide: boolean = true;
  touchHubPosition: 'bottom' | 'top' = 'bottom';

  onTouchHubConfigChange(): void {
    if (!this.displayConfig.touchhub_config) {
      this.displayConfig.touchhub_config = {
        enabled: !!this.displayConfig.touchhub_enabled,
        autoHide: this.touchHubAutoHide,
        position: this.touchHubPosition
      };
    } else {
      this.displayConfig.touchhub_config.autoHide = this.touchHubAutoHide;
      this.displayConfig.touchhub_config.position = this.touchHubPosition;
    }
  }

  get canvasFontFamily(): string {
    return getFontFamilyString(this.displayConfig.font_family);
  }

  getWidgetFont(widget: Widget): string {
    return widget.style?.fontFamily ? getFontFamilyString(widget.style.fontFamily) : 'inherit';
  }

  onFontChange(): void {
    if (this.displayConfig.font_family) {
      loadGoogleFont(this.displayConfig.font_family);
    }
  }

  setWidgetFont(fontId: string): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) {
      this.selectedWidget.style = { opacity: 1, borderRadius: 12, backdropBlur: true };
    }
    this.selectedWidget.style.fontFamily = fontId || undefined;
    if (fontId) {
      loadGoogleFont(fontId);
    }
    this.pushHistory();
  }

  getEditorWeatherAlert(): SevereWeatherAlertData | null {
    if (!this.weatherAlertText) return null;
    return {
      title: 'Severe Weather Warning',
      message: this.weatherAlertText,
      severity: 'warning'
    };
  }

  onWeatherAlertChange(): void {
    this.displayConfig.weather_alert = this.weatherAlertText ? this.weatherAlertText : undefined;
  }

  setWeatherAlertPreset(text: string): void {
    this.weatherAlertText = text;
    this.weatherAlertsEnabled = true;
    this.displayConfig.weather_alerts_enabled = true;
    this.displayConfig.weather_alert = text;
  }

  clearWeatherAlert(): void {
    this.weatherAlertText = '';
    this.displayConfig.weather_alert = undefined;
  }

  openTemplatesModal(): void {
    this.showTemplatesModal = true;
  }

  applyTemplateToCurrentPage(tmpl: DashboardTemplate): void {
    if (this.pageWidgets.length > 0) {
      if (!confirm(`Apply "${tmpl.name}"? This will replace the ${this.pageWidgets.length} widgets on the current page.`)) {
        return;
      }
    }
    const targetPageId = this.activePageId || 'default';
    this.widgets = this.widgets.filter(w => (w.page_id || 'default') !== targetPageId);
    
    const newWidgets = tmpl.generateWidgets(this.canvasWidth, this.canvasHeight, targetPageId);
    let nextId = Date.now();
    newWidgets.forEach(pw => {
      this.widgets.push({
        id: nextId++,
        type: pw.type!,
        page_id: targetPageId,
        customName: pw.customName,
        position: pw.position!,
        config: pw.config || {},
        style: pw.style || { borderRadius: 16 }
      });
    });
    this.selectedWidget = null;
    this.showTemplatesModal = false;
    this.pushHistory();
  }

  applyTemplateAsNewPage(tmpl: DashboardTemplate): void {
    const pageId = 'page_' + Date.now().toString(36);
    const newPage: DisplayPage = {
      id: pageId,
      name: tmpl.name,
      duration_seconds: 30
    };
    this.pages.push(newPage);
    this.activePageId = pageId;

    const newWidgets = tmpl.generateWidgets(this.canvasWidth, this.canvasHeight, pageId);
    let nextId = Date.now();
    newWidgets.forEach(pw => {
      this.widgets.push({
        id: nextId++,
        type: pw.type!,
        page_id: pageId,
        customName: pw.customName,
        position: pw.position!,
        config: pw.config || {},
        style: pw.style || { borderRadius: 16 }
      });
    });
    this.selectedWidget = null;
    this.showTemplatesModal = false;
    this.pushHistory();
  }

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private chimeService: AudioChimeService
  ) {}

  goToFleet(): void {
    this.router.navigate(['/admin/displays']);
  }

  openInstallationGuide(): void {
    this.router.navigate(['/docs/installation']);
  }

  getOtherWidgets(current: Widget): Widget[] {
    return this.widgets.filter(w => w.id !== current.id);
  }

  addRuleToSelectedWidget(): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.rules) {
      this.selectedWidget.rules = [];
    }
    this.selectedWidget.rules.push({
      id: 'rule_' + Date.now(),
      field: 'value',
      operator: 'gt',
      threshold: 80,
      action: 'set_class',
      className: 'alert-glow-red'
    });
    this.pushHistory();
  }

  removeRuleFromSelectedWidget(index: number): void {
    if (!this.selectedWidget?.rules) return;
    this.selectedWidget.rules.splice(index, 1);
    this.pushHistory();
  }

  testChime(type: 'doorbell' | 'marimba' | 'gong' | 'alert' = 'doorbell'): void {
    if (type === 'doorbell') this.chimeService.playDoorbell();
    else if (type === 'marimba') this.chimeService.playMarimba();
    else if (type === 'gong') this.chimeService.playHourlyGong();
    else if (type === 'alert') this.chimeService.playAlert();
  }

  getSafeYoutubeUrl(id?: string): SafeResourceUrl {
    const videoId = id || 'jfKfPfyJRdk';
    const url = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.http.get<DisplayResponse>(`${environment.apiUrl}/get_display.php?token=${this.token}`)
        .subscribe(res => {
          if (res && res.success) {
            this.displayConfig = res.display;
            this.widgets = res.widgets || [];

            this.logoUrl = res.display.logo_url || '';
            this.showLogoKiosk = !!res.display.show_logo_kiosk;

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

            if (res.display.font_family) {
              loadGoogleFont(res.display.font_family);
            }
            if (res.display.weather_alerts_enabled !== undefined) {
              this.weatherAlertsEnabled = !!res.display.weather_alerts_enabled;
            }
            if (res.display.weather_alert) {
              this.weatherAlertText = typeof res.display.weather_alert === 'string'
                ? res.display.weather_alert
                : (res.display.weather_alert.message || '');
            }
            if (res.display.custom_css) {
              this.customCss = res.display.custom_css;
            }
            if (res.display.audio_chimes_enabled !== undefined) {
              this.audioChimesEnabled = !!res.display.audio_chimes_enabled;
            }
            if (res.display.hourly_chime !== undefined) {
              this.hourlyChime = !!res.display.hourly_chime;
            }
            if (res.display.touchhub_enabled !== undefined) {
              this.displayConfig.touchhub_enabled = !!res.display.touchhub_enabled;
            }
            if (res.display.touchhub_config) {
              this.touchHubAutoHide = res.display.touchhub_config.autoHide !== false;
              this.touchHubPosition = res.display.touchhub_config.position || 'bottom';
            }
            (res.widgets || []).forEach(w => {
              if (w.style?.fontFamily) loadGoogleFont(w.style.fontFamily);
            });

            this.updateOrientation();
          }
        });
    }

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.stopDragOrResize());
    window.addEventListener('resize', () => {
      if (this.autoFit) {
        this.calculateAutoFit();
      }
    });
  }

  ngAfterViewInit(): void {
    this.calculateAutoFit();
  }

  get pageWidgets(): Widget[] {
    return this.widgets.filter(w => !w.page_id || w.page_id === this.activePageId || w.page_id === 'default');
  }

  updateOrientation(): void {
    const orient = this.displayConfig.orientation || 'landscape_720p';
    switch (orient) {
      case 'landscape_1440p':
        this.canvasWidth = 2560;
        this.canvasHeight = 1440;
        break;
      case 'landscape_4k':
        this.canvasWidth = 3840;
        this.canvasHeight = 2160;
        break;
      case 'landscape_1080p':
        this.canvasWidth = 1920;
        this.canvasHeight = 1080;
        break;
      case 'portrait_1440p':
        this.canvasWidth = 1440;
        this.canvasHeight = 2560;
        break;
      case 'portrait_4k':
        this.canvasWidth = 2160;
        this.canvasHeight = 3840;
        break;
      case 'portrait_1080p':
        this.canvasWidth = 1080;
        this.canvasHeight = 1920;
        break;
      case 'portrait_720p':
        this.canvasWidth = 720;
        this.canvasHeight = 1280;
        break;
      case 'landscape_16_10':
        this.canvasWidth = 1920;
        this.canvasHeight = 1200;
        break;
      case 'portrait_16_10':
        this.canvasWidth = 1200;
        this.canvasHeight = 1920;
        break;
      case 'landscape_4_3':
        this.canvasWidth = 1600;
        this.canvasHeight = 1200;
        break;
      case 'portrait_4_3':
        this.canvasWidth = 1200;
        this.canvasHeight = 1600;
        break;
      case 'ultrawide':
        this.canvasWidth = 3440;
        this.canvasHeight = 1440;
        break;
      case 'freeform':
        // For freeform, keep the current values, allow user to resize via input.
        // E.g., defaulting to 1024x1024 if currently undefined.
        this.canvasWidth = this.canvasWidth || 1024;
        this.canvasHeight = this.canvasHeight || 1024;
        break;
      case 'landscape_720p':
      default:
        this.canvasWidth = 1280;
        this.canvasHeight = 720;
        break;
    }

    if (this.autoFit) {
      this.calculateAutoFit();
    }
  }

  calculateAutoFit(): void {
    setTimeout(() => {
      const viewport = document.getElementById('editorViewport');
      if (!viewport) return;
      const availableW = viewport.clientWidth - 80; // 40px margin/padding on each side
      const availableH = viewport.clientHeight - 110; // 32px top + 78px bottom zoom bar
      if (availableW <= 0 || availableH <= 0 || this.canvasWidth <= 0 || this.canvasHeight <= 0) return;
      const scaleX = availableW / this.canvasWidth;
      const scaleY = availableH / this.canvasHeight;
      const fitScale = Math.min(scaleX, scaleY);
      this.zoomLevel = Math.max(0.1, Math.min(1.0, Math.floor(fitScale * 100) / 100));
    }, 50);
  }

  setZoom(level: number): void {
    this.zoomLevel = level;
    this.autoFit = false;
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(2.0, +(this.zoomLevel + 0.1).toFixed(2));
    this.autoFit = false;
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(0.15, +(this.zoomLevel - 0.1).toFixed(2));
    this.autoFit = false;
  }

  toggleAutoFit(): void {
    this.autoFit = true;
    this.calculateAutoFit();
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
          albumUrl: '',
          images: [
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&q=80',
            'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1280&q=80'
          ],
          intervalSeconds: 10,
          fitMode: 'cover',
          blurBackground: true,
          showCaptions: false
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
        initialConfig = {
          title: 'Smart Home',
          haUrl: '',
          token: '',
          entities: [
            { entityId: 'light.living_room', label: 'Living Room Lights', state: 'on', icon: '💡' },
            { entityId: 'climate.thermostat', label: 'Nest Thermostat', state: '72', unit: '°F', icon: '🌡️' },
            { entityId: 'lock.front_door', label: 'Front Door Lock', state: 'locked', icon: '🔒' },
            { entityId: 'binary_sensor.driveway', label: 'Driveway Camera', state: 'clear', icon: '📹' }
          ],
          refreshSeconds: 30
        };
        initialSize = { width: 360, height: 240 };
        break;
      case 'spotify':
        initialConfig = { track: 'Midnight City', artist: 'M83', isPlaying: true };
        initialSize = { width: 360, height: 160 };
        break;
      case 'stock_crypto':
        initialConfig = {
          title: 'Markets & Stocks',
          symbols: ['AAPL', 'TSLA', 'NVDA', 'SPY'],
          cryptoIds: ['bitcoin', 'ethereum', 'solana'],
          mode: 'all',
          currency: 'USD',
          showSparklines: true,
          refreshMinutes: 3
        };
        initialSize = { width: 360, height: 280 };
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
      case 'radar':
        initialConfig = {
          cityName: 'San Francisco Bay Area',
          lat: 37.7749,
          lon: -122.4194,
          zoom: 7,
          colorScheme: 2,
          smooth: true,
          refreshMinutes: 10
        };
        initialSize = { width: 380, height: 300 };
        break;
      case 'quote':
        initialConfig = {
          category: 'inspirational'
        };
        initialSize = { width: 340, height: 180 };
        break;
      case 'ai_briefing':
        initialConfig = {
          userName: 'Sandip',
          tone: 'warm',
          refreshHours: 1
        };
        initialSize = { width: 460, height: 200 };
        break;
      case 'chores':
        initialConfig = {
          title: 'Family Chores',
          members: [
            { id: '1', name: 'Lucas', avatar: '🦁', points: 140, streak: 5 },
            { id: '2', name: 'Emma', avatar: '🦄', points: 180, streak: 7 },
            { id: '3', name: 'Mom', avatar: '👑', points: 90, streak: 12 },
            { id: '4', name: 'Dad', avatar: '⚡', points: 110, streak: 4 }
          ],
          chores: [
            { id: 'c1', memberId: '1', title: 'Make Bedroom Bed', points: 10, completed: true },
            { id: 'c2', memberId: '1', title: 'Feed the Dog 🐕', points: 15, completed: false },
            { id: 'c3', memberId: '2', title: 'Violin Practice 🎻', points: 25, completed: false },
            { id: 'c4', memberId: '3', title: 'Morning 5k Run 🏃‍♀️', points: 30, completed: true }
          ]
        };
        initialSize = { width: 380, height: 320 };
        break;
      case 'camera_pip':
        initialConfig = {
          title: 'Driveway Camera',
          streamUrl: '',
          snapshotUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80',
          aspectRatio: '16:9',
          refreshSeconds: 4
        };
        initialSize = { width: 380, height: 240 };
        break;
      case 'commute':
        initialConfig = {
          title: 'Morning Commute',
          destinations: [
            { id: '1', name: 'Downtown Office', icon: '🏢', durationMinutes: 24, trafficStatus: 'fast', viaRoute: 'via I-280 N', delayMinutes: 0 },
            { id: '2', name: 'San Jose Airport (SJC)', icon: '✈️', durationMinutes: 18, trafficStatus: 'moderate', viaRoute: 'via US-101 S', delayMinutes: 4 }
          ]
        };
        initialSize = { width: 360, height: 240 };
        break;
      case 'youtube':
        initialConfig = {
          title: 'Lofi Chill Beats ☕',
          urlOrId: 'jfKfPfyJRdk',
          autoplay: true,
          muted: true,
          loop: true,
          showControls: false,
          isLive: true
        };
        initialSize = { width: 440, height: 260 };
        break;
      case 'text':
        initialConfig = {
          title: 'Announcement',
          body: 'Welcome to the Smart Display!\nAdd your message here.',
          fontSize: 'medium',
          textAlign: 'left'
        };
        initialSize = { width: 340, height: 200 };
        break;
      case 'qrcode':
        initialConfig = {
          data: 'https://smart-kiosk.online',
          label: 'Scan Me',
          size: 200
        };
        initialSize = { width: 240, height: 280 };
        break;
      case 'world_clocks':
        initialConfig = {
          clocks: [
            { label: 'New York', timezone: 'America/New_York' },
            { label: 'London', timezone: 'Europe/London' },
            { label: 'Tokyo', timezone: 'Asia/Tokyo' }
          ]
        };
        initialSize = { width: 320, height: 220 };
        break;
      case 'shapes':
        initialConfig = {
          shape: 'rectangle',
          color: '#6366f1',
          fillOpacity: 0.3
        };
        initialSize = { width: 300, height: 4 };
        break;
      case 'scheduled_text':
        initialConfig = {
          message: 'Good morning! Have a great day!',
          startTime: '06:00',
          endTime: '12:00',
          showDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        };
        initialSize = { width: 340, height: 180 };
        break;
      case 'button':
        initialConfig = {
          label: 'Open Link',
          icon: '🔗',
          url: '',
          style: 'gradient'
        };
        initialSize = { width: 200, height: 160 };
        break;
      case 'sun_moon':
        initialConfig = {
          latitude: 37.3382,
          longitude: -121.8863,
          cityName: 'San Jose'
        };
        initialSize = { width: 320, height: 280 };
        break;
      case 'analog_clock':
        initialConfig = {
          showSeconds: true,
          showNumbers: true,
          accentColor: '#3b82f6'
        };
        initialSize = { width: 260, height: 260 };
        break;
      case 'rest_fetch':
        initialConfig = {
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
          jsonPath: 'bitcoin.usd',
          title: 'Bitcoin Price',
          prefix: '$',
          unit: 'USD',
          refreshSeconds: 60,
          icon: '🪙'
        };
        initialSize = { width: 280, height: 180 };
        break;
      case 'gauge':
        initialConfig = {
          value: 68,
          min: 0,
          max: 100,
          unit: '%',
          title: 'System Load',
          warnThreshold: 75,
          critThreshold: 90,
          colorScheme: 'green-yellow-red',
          icon: '⚡'
        };
        initialSize = { width: 280, height: 210 };
        break;
      case 'whiteboard':
        initialConfig = {
          defaultColor: '#00ffcc',
          defaultSize: 3,
          backgroundColor: '#1a1d24',
          canvasTitle: 'Family Notes & Doodles',
          strokes: []
        };
        initialSize = { width: 440, height: 320 };
        break;
      case 'google_maps':
        initialConfig = {
          address: 'Austin, TX',
          zoom: 13,
          mapType: 'm',
          showTraffic: true,
          title: 'Austin Live Traffic & Map'
        };
        initialSize = { width: 420, height: 320 };
        break;
      case 'slack':
        initialConfig = {
          channelName: 'announcements',
          workspaceName: 'Acme Team',
          showAvatars: true,
          maxMessages: 5,
          mockMessages: [
            { id: '1', user: 'Sarah Connor', handle: 'sarah', text: 'All systems operational for deployment today 🚀', time: '10:24 AM', avatarColor: '#10b981' },
            { id: '2', user: 'Alex Chen', handle: 'achen', text: 'Reminder: Kitchen fridge cleanout at 4 PM!', time: '11:15 AM', avatarColor: '#3b82f6' },
            { id: '3', user: 'Taylor Swift', handle: 'taylor', text: 'New release candidate v3.0 is live on staging.', time: '12:02 PM', avatarColor: '#ec4899' }
          ]
        };
        initialSize = { width: 380, height: 300 };
        break;
      case 'gmail':
        initialConfig = {
          emailAddress: 'family@smart-display.online',
          unreadCount: 3,
          showSnippet: true,
          previews: [
            { from: 'School Principal', subject: 'Spring Break Schedule & Parent Night', snippet: 'Please note school will be closed on Friday...', time: '8:45 AM', isUnread: true },
            { from: 'Amazon Deliveries', subject: 'Your package will arrive today by 7 PM', snippet: 'Track your order #112-984219...', time: '10:12 AM', isUnread: true },
            { from: 'City Utility Services', subject: 'Monthly Statement Ready for Review', snippet: 'Your e-statement for the billing cycle is now ready...', time: '1:30 PM', isUnread: false }
          ]
        };
        initialSize = { width: 360, height: 280 };
        break;
      case 'tradingview':
        initialConfig = {
          symbol: 'NASDAQ:AAPL',
          interval: '1D',
          theme: 'dark',
          chartStyle: '1',
          showVolume: true,
          title: 'Apple Inc. (AAPL)'
        };
        initialSize = { width: 480, height: 320 };
        break;
      case 'reddit':
        initialConfig = {
          subreddit: 'EarthPorn',
          sort: 'hot',
          intervalSeconds: 30,
          showScore: true,
          showTitle: true
        };
        initialSize = { width: 440, height: 320 };
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
    this.pushHistory();
  }

  applyRestFetchPreset(widget: Widget, presetKey: string): void {
    if (!widget || !widget.config) return;
    if (presetKey === 'homeassistant') {
      widget.config.url = 'http://corelabel-infraRA:8123/api/states/sensor.temperature';
      widget.config.authHeader = 'Bearer YOUR_HOME_ASSISTANT_TOKEN';
      widget.config.jsonPath = 'state';
      widget.config.title = 'Living Room Temp';
      widget.config.prefix = '';
      widget.config.unit = '°F';
      widget.config.icon = '🌡️';
      widget.config.refreshSeconds = 30;
    } else if (presetKey === 'bitcoin') {
      widget.config.url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
      widget.config.authHeader = '';
      widget.config.jsonPath = 'bitcoin.usd';
      widget.config.title = 'Bitcoin Price';
      widget.config.prefix = '$';
      widget.config.unit = 'USD';
      widget.config.icon = '🪙';
      widget.config.refreshSeconds = 60;
    } else if (presetKey === 'ip_geo') {
      widget.config.url = 'https://ipapi.co/json/';
      widget.config.authHeader = '';
      widget.config.jsonPath = 'city';
      widget.config.title = 'Current City';
      widget.config.prefix = '';
      widget.config.unit = '';
      widget.config.icon = '📍';
      widget.config.refreshSeconds = 300;
    }
  }

  removeSelectedWidget(): void {
    if (!this.selectedWidget) return;
    this.widgets = this.widgets.filter(w => w !== this.selectedWidget);
    this.selectedWidget = null;
    this.pushHistory();
  }

  parseJson(val: string): any {
    try {
      return JSON.parse(val);
    } catch {
      return this.selectedWidget?.config.clocks || [];
    }
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

  getStockSymbolsText(widget: Widget): string {
    if (!widget.config.symbols) return '';
    return Array.isArray(widget.config.symbols) ? widget.config.symbols.join(', ') : String(widget.config.symbols);
  }

  setStockSymbolsText(widget: Widget, text: string): void {
    widget.config.symbols = text.split(',').map(s => s.trim().toUpperCase()).filter(s => !!s);
  }

  addQuickStock(widget: Widget, sym: string): void {
    let list: string[] = Array.isArray(widget.config.symbols) ? [...widget.config.symbols] : (typeof widget.config.symbols === 'string' ? widget.config.symbols.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean) : []);
    if (!list.includes(sym)) {
      list.push(sym);
      widget.config.symbols = list;
    }
  }

  addQuickCrypto(widget: Widget, coin: string): void {
    let list: string[] = Array.isArray(widget.config.cryptoIds) ? [...widget.config.cryptoIds] : (typeof widget.config.cryptoIds === 'string' ? widget.config.cryptoIds.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean) : []);
    if (!list.includes(coin)) {
      list.push(coin);
      widget.config.cryptoIds = list;
    }
  }

  onRadarCitySelect(widget: Widget, event: any): void {
    const val = event.target.value;
    if (!val) return;
    const [city, lat, lon] = val.split('|');
    if (city && lat && lon) {
      widget.config.cityName = city;
      widget.config.lat = parseFloat(lat);
      widget.config.lon = parseFloat(lon);
    }
  }

  addSmartHomeEntity(widget: Widget): void {
    if (!widget.config.entities) widget.config.entities = [];
    widget.config.entities.push({
      entityId: 'light.new_device',
      label: 'New Smart Device',
      state: 'on',
      icon: '💡'
    });
  }

  removeSmartHomeEntity(widget: Widget, index: number): void {
    if (widget.config.entities) {
      widget.config.entities.splice(index, 1);
    }
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
    if (this.isResizing || widget.locked) return;
    this.isDragging = true;
    this.selectedWidget = widget;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.widgetStartX = widget.position.x;
    this.widgetStartY = widget.position.y;
  }

  startResize(event: MouseEvent, widget: Widget, handle: string): void {
    event.stopPropagation();
    if (widget.locked) return;
    this.isResizing = true;
    this.isDragging = false;
    this.selectedWidget = widget;
    this.resizeHandle = handle;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.initPos = { ...widget.position };
  }

  // --- Block Layers & Z-Index Management ---
  get pageWidgetsReversed(): Widget[] {
    // Top-most layer is last in DOM array, so reversed shows top layer on top
    return [...this.pageWidgets].reverse();
  }

  moveLayerUp(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    this.pushHistory();
    const idx = this.widgets.indexOf(widget);
    if (idx < 0) return;
    let nextIdx = -1;
    for (let i = idx + 1; i < this.widgets.length; i++) {
      if (this.isWidgetOnActivePage(this.widgets[i])) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx !== -1) {
      const temp = this.widgets[idx];
      this.widgets[idx] = this.widgets[nextIdx];
      this.widgets[nextIdx] = temp;
    }
  }

  moveLayerDown(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    this.pushHistory();
    const idx = this.widgets.indexOf(widget);
    if (idx <= 0) return;
    let prevIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (this.isWidgetOnActivePage(this.widgets[i])) {
        prevIdx = i;
        break;
      }
    }
    if (prevIdx !== -1) {
      const temp = this.widgets[idx];
      this.widgets[idx] = this.widgets[prevIdx];
      this.widgets[prevIdx] = temp;
    }
  }

  toggleWidgetLock(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    widget.locked = !widget.locked;
  }

  toggleWidgetVisibility(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    widget.hidden = !widget.hidden;
  }

  deleteWidgetFromLayer(widget: Widget, event: MouseEvent): void {
    event.stopPropagation();
    this.pushHistory();
    const idx = this.widgets.indexOf(widget);
    if (idx !== -1) {
      this.widgets.splice(idx, 1);
      if (this.selectedWidget === widget) {
        this.selectedWidget = null;
      }
    }
  }

  isWidgetOnActivePage(widget: Widget): boolean {
    if (this.pages.length <= 1) return true;
    return !widget.page_id || widget.page_id === this.activePageId || widget.page_id === 'default';
  }

  // --- Scheduling Helpers ---
  isWidgetScheduleEnabled(widget: Widget): boolean {
    return !!widget?.schedule?.enabled;
  }

  toggleWidgetScheduleEnabled(): void {
    if (!this.selectedWidget) return;
    const sched = this.getOrCreateWidgetSchedule(this.selectedWidget);
    sched.enabled = !sched.enabled;
  }

  getOrCreateWidgetSchedule(widget: Widget): WidgetSchedule {
    if (!widget.schedule) {
      widget.schedule = {
        enabled: false,
        startTime: '08:00',
        endTime: '18:00',
        days: [1, 2, 3, 4, 5]
      };
    }
    if (!widget.schedule.days) {
      widget.schedule.days = [1, 2, 3, 4, 5];
    }
    return widget.schedule;
  }

  isDaySelected(sched: WidgetSchedule | undefined, day: number): boolean {
    if (!sched || !sched.days) return false;
    return sched.days.includes(day);
  }

  toggleDay(sched: WidgetSchedule | undefined, day: number): void {
    if (!sched) return;
    if (!sched.days) sched.days = [];
    const idx = sched.days.indexOf(day);
    if (idx !== -1) {
      sched.days.splice(idx, 1);
    } else {
      sched.days.push(day);
      sched.days.sort((a, b) => a - b);
    }
  }

  setDayPreset(sched: WidgetSchedule | undefined, preset: 'all' | 'weekdays' | 'weekends'): void {
    if (!sched) return;
    if (preset === 'all') {
      sched.days = [0, 1, 2, 3, 4, 5, 6];
    } else if (preset === 'weekdays') {
      sched.days = [1, 2, 3, 4, 5];
    } else if (preset === 'weekends') {
      sched.days = [0, 6];
    }
  }

  getOrCreatePageSchedule(page: DisplayPage): WidgetSchedule {
    if (!page.schedule) {
      page.schedule = {
        enabled: false,
        startTime: '08:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5]
      };
    }
    if (!page.schedule.days) {
      page.schedule.days = [1, 2, 3, 4, 5];
    }
    return page.schedule;
  }

  togglePageSchedule(page: DisplayPage): void {
    if (!page.schedule) {
      page.schedule = {
        enabled: true,
        startTime: '08:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5]
      };
    } else {
      page.schedule.enabled = !page.schedule.enabled;
    }
  }

  getWidgetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      clock: 'Digital Clock',
      weather: 'Weather Forecast',
      calendar: 'Calendar Events',
      photo: 'Photo Album',
      rss: 'News RSS Feed',
      todo: 'Tasks & Chores',
      homeassistant: 'Home Assistant',
      spotify: 'Spotify Player',
      stock_crypto: 'Stocks & Crypto',
      sticky_note: 'Sticky Note',
      countdown: 'Event Countdown',
      meal_planner: 'Meal Planner',
      radar: 'Weather Radar',
      quote: 'Daily Quote',
      ai_briefing: 'AI Ambient Briefing',
      chores: 'Gamified Chores',
      camera_pip: 'Live Camera PIP',
      commute: 'Commute Traffic',
      youtube: 'YouTube Stream',
      text: 'Announcement Banner',
      qrcode: 'Scannable QR Code',
      world_clocks: 'World Clocks',
      shapes: 'Shape / Divider',
      scheduled_text: 'Scheduled Text',
      button: 'Action Button',
      sun_moon: 'Sun & Moon Phases',
      analog_clock: 'Analog Clock',
      rest_fetch: 'REST Data Fetch',
      gauge: 'Radial Gauge'
    };
    return labels[type] || (type ? type.toUpperCase() : 'Widget');
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.selectedWidget) return;

    const zoom = this.zoomLevel || 1.0;

    if (this.isDragging) {
      const dx = (event.clientX - this.dragStartX) / zoom;
      const dy = (event.clientY - this.dragStartY) / zoom;

      const rawX = Math.max(0, Math.min(this.canvasWidth - this.selectedWidget.position.width, this.widgetStartX + dx));
      const rawY = Math.max(0, Math.min(this.canvasHeight - this.selectedWidget.position.height, this.widgetStartY + dy));

      this.selectedWidget.position.x = this.snap(rawX);
      this.selectedWidget.position.y = this.snap(rawY);
    } else if (this.isResizing) {
      const dx = (event.clientX - this.resizeStartX) / zoom;
      const dy = (event.clientY - this.resizeStartY) / zoom;
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
    if (this.isDragging || this.isResizing) {
      this.pushHistory();
    }
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = '';
  }

  pushHistory(): void {
    if (this.isApplyingHistory) return;
    const snapshot = JSON.stringify({
      widgets: this.widgets,
      pages: this.pages,
      backgroundConfig: this.backgroundConfig,
      sleepSchedule: this.sleepSchedule,
      activePageId: this.activePageId
    });
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }
    this.historyStack.push(snapshot);
    if (this.historyStack.length > 40) {
      this.historyStack.shift();
    }
    this.historyIndex = this.historyStack.length - 1;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.historyStack.length - 1;
  }

  undo(): void {
    if (!this.canUndo()) return;
    this.historyIndex--;
    this.applyHistorySnapshot(this.historyStack[this.historyIndex]);
  }

  redo(): void {
    if (!this.canRedo()) return;
    this.historyIndex++;
    this.applyHistorySnapshot(this.historyStack[this.historyIndex]);
  }

  private applyHistorySnapshot(jsonStr: string): void {
    try {
      this.isApplyingHistory = true;
      const data = JSON.parse(jsonStr);
      this.widgets = data.widgets || [];
      this.pages = data.pages || [];
      this.backgroundConfig = data.backgroundConfig || this.backgroundConfig;
      this.sleepSchedule = data.sleepSchedule || this.sleepSchedule;
      this.activePageId = data.activePageId || this.activePageId;
      if (this.selectedWidget) {
        this.selectedWidget = this.widgets.find(w => w.id === this.selectedWidget?.id) || null;
      }
    } finally {
      this.isApplyingHistory = false;
    }
  }

  duplicateSelectedWidget(): void {
    if (!this.selectedWidget) return;
    const cloned: Widget = JSON.parse(JSON.stringify(this.selectedWidget));
    cloned.id = Date.now();
    cloned.position.x = Math.min(this.canvasWidth - cloned.position.width, cloned.position.x + 24);
    cloned.position.y = Math.min(this.canvasHeight - cloned.position.height, cloned.position.y + 24);
    this.widgets.push(cloned);
    this.selectedWidget = cloned;
    this.pushHistory();
  }

  alignSelectedWidget(mode: 'left' | 'center_h' | 'right' | 'top' | 'center_v' | 'bottom'): void {
    if (!this.selectedWidget) return;
    const p = this.selectedWidget.position;
    switch (mode) {
      case 'left':
        p.x = 20;
        break;
      case 'center_h':
        p.x = Math.round((this.canvasWidth - p.width) / 2);
        break;
      case 'right':
        p.x = this.canvasWidth - p.width - 20;
        break;
      case 'top':
        p.y = 20;
        break;
      case 'center_v':
        p.y = Math.round((this.canvasHeight - p.height) / 2);
        break;
      case 'bottom':
        p.y = this.canvasHeight - p.height - 20;
        break;
    }
    this.pushHistory();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    
    // Undo: Ctrl+Z / Cmd+Z (without Shift)
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
      if (!isInput) {
        event.preventDefault();
        this.undo();
      }
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
    if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')) {
      if (!isInput) {
        event.preventDefault();
        this.redo();
      }
      return;
    }

    // Duplicate: Ctrl+D / Cmd+D
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      if (this.selectedWidget && !isInput) {
        event.preventDefault();
        this.duplicateSelectedWidget();
      }
      return;
    }

    // Delete / Backspace
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isInput && this.selectedWidget) {
      event.preventDefault();
      this.removeSelectedWidget();
      return;
    }

    // Arrow Key Nudges
    if (!isInput && this.selectedWidget && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const delta = event.shiftKey ? 20 : 5;
      const p = this.selectedWidget.position;
      if (event.key === 'ArrowLeft') p.x = Math.max(0, p.x - delta);
      if (event.key === 'ArrowRight') p.x = Math.min(this.canvasWidth - p.width, p.x + delta);
      if (event.key === 'ArrowUp') p.y = Math.max(0, p.y - delta);
      if (event.key === 'ArrowDown') p.y = Math.min(this.canvasHeight - p.height, p.y + delta);
      this.pushHistory();
    }
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
      logo_url: this.logoUrl,
      show_logo_kiosk: this.showLogoKiosk,
      font_family: this.displayConfig.font_family,
      weather_alerts_enabled: this.weatherAlertsEnabled,
      weather_alert: this.weatherAlertText ? this.weatherAlertText : null,
      custom_css: this.customCss,
      audio_chimes_enabled: this.audioChimesEnabled,
      hourly_chime: this.hourlyChime,
      touchhub_enabled: this.displayConfig.touchhub_enabled,
      touchhub_config: {
        enabled: !!this.displayConfig.touchhub_enabled,
        autoHide: this.touchHubAutoHide !== false,
        position: this.touchHubPosition || 'bottom'
      },
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

  testGeminiKey(): void {
    if (!this.selectedWidget || !this.selectedWidget.config.apiKey) {
      this.geminiTestResult = { success: false, message: 'Please enter a Gemini API key first.' };
      return;
    }
    this.testingGemini = true;
    this.geminiTestResult = null;
    this.http.post<any>(`${environment.apiUrl}/ai_briefing.php`, {
      apiKey: this.selectedWidget.config.apiKey.trim(),
      test: true
    }).subscribe({
      next: (res) => {
        this.testingGemini = false;
        if (res && res.success) {
          this.geminiTestResult = { 
            success: true, 
            message: res.message || 'Connected! Google Gemini is working.' 
          };
          if (this.selectedWidget) {
            this.selectedWidget.config = { ...this.selectedWidget.config };
          }
        } else {
          this.geminiTestResult = { 
            success: false, 
            message: res?.error || 'Validation failed. Check your API key.' 
          };
        }
      },
      error: (err) => {
        this.testingGemini = false;
        this.geminiTestResult = { 
          success: false, 
          message: err?.error?.error || err?.message || 'Server network error.' 
        };
      }
    });
  }

  addCalendarFeed(widget: Widget): void {
    if (!widget.config.feeds) widget.config.feeds = [];
    widget.config.feeds.push({ name: 'Family', url: '', color: '#ec4899' });
    this.pushHistory();
  }

  removeCalendarFeed(widget: Widget, index: number): void {
    if (widget.config.feeds) {
      widget.config.feeds.splice(index, 1);
      this.pushHistory();
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
    this.pushHistory();
  }

  removeStickyNote(widget: Widget, index: number): void {
    if (widget.config.notes) {
      widget.config.notes.splice(index, 1);
      this.pushHistory();
    }
  }

  // ========================
  // AUTO ARRANGE LAYOUTS
  // ========================

  openAutoArrangeModal(): void {
    this.selectedLayoutIndex = -1;
    this.layoutPreviews = this.generateAllLayouts();
    this.showAutoArrangeModal = true;
  }

  generateAllLayouts(): { name: string; icon: string; description: string; positions: { x: number; y: number; width: number; height: number }[] }[] {
    const widgets = this.pageWidgets;
    const cw = this.canvasWidth;
    const ch = this.canvasHeight;
    const n = widgets.length;
    if (n < 2) return [];

    return [
      { name: 'Golden Spiral', icon: '🌀', description: 'Fibonacci-inspired proportioned asymmetric layout', positions: this.layoutGoldenSpiral(widgets, cw, ch) },
      { name: 'Editorial Hero', icon: '📰', description: 'A massive visual hero block balanced by a neat sidebar of details', positions: this.layoutEditorialHero(widgets, cw, ch) },
      { name: 'Zen Overlap', icon: '🍃', description: 'Floating widgets with elegant negative space and slight overlaps', positions: this.layoutZenOverlap(widgets, cw, ch) },
      { name: 'Mondrian', icon: '🟥', description: 'Bold, structured abstract geometric compartments', positions: this.layoutMondrian(widgets, cw, ch) },
      { name: 'Rule of Thirds', icon: '◰', description: 'Classic photography grid alignment for strong visual anchors', positions: this.layoutRuleOfThirds(widgets, cw, ch) },
      { name: 'Typographic', icon: 'T', description: 'Ultra-wide and narrow contrast blocks for text-heavy displays', positions: this.layoutTypographic(widgets, cw, ch) }
    ];
  }

  private assignCreativeBoxes(widgets: Widget[], boxes: {x: number, y: number, width: number, height: number}[]): {x: number, y: number, width: number, height: number}[] {
    const heroTypes = ['photo', 'youtube', 'radar', 'ai_briefing', 'weather', 'clock'];
    const listTypes = ['calendar', 'todo', 'rss', 'chores', 'meal_planner'];

    const scored = widgets.map((w, i) => {
      let score = 0;
      if (heroTypes.includes(w.type)) score += 100 - heroTypes.indexOf(w.type);
      else if (listTypes.includes(w.type)) score += 50 - listTypes.indexOf(w.type);
      return { index: i, score: score, widget: w };
    });

    scored.sort((a, b) => b.score - a.score);
    const sortedBoxes = [...boxes].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const positions = new Array(widgets.length);
    for (let i = 0; i < scored.length; i++) {
      // Safely map in case we have more widgets than boxes (shouldn't happen but just in case)
      const box = i < sortedBoxes.length ? sortedBoxes[i] : sortedBoxes[sortedBoxes.length - 1];
      positions[scored[i].index] = { ...box };
    }
    return positions;
  }

  layoutGoldenSpiral(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 30;
    const gap = 20;
    const boxes = [];
    
    let x = margin;
    let y = margin;
    let w = cw - margin * 2;
    let h = ch - margin * 2;
    let dir = 0; // 0=right, 1=down, 2=left, 3=up

    for(let i = 0; i < n; i++) {
       if (i === n - 1) {
          boxes.push({x, y, width: w, height: h});
          break;
       }
       const ratio = 0.618;
       if (dir === 0) {
          const splitW = Math.floor((w - gap) * ratio);
          boxes.push({x, y, width: splitW, height: h});
          x += splitW + gap;
          w -= splitW + gap;
       } else if (dir === 1) {
          const splitH = Math.floor((h - gap) * ratio);
          boxes.push({x, y, width: w, height: splitH});
          y += splitH + gap;
          h -= splitH + gap;
       } else if (dir === 2) {
          const splitW = Math.floor((w - gap) * ratio);
          boxes.push({x: x + w - splitW, y, width: splitW, height: h});
          w -= splitW + gap;
       } else if (dir === 3) {
          const splitH = Math.floor((h - gap) * ratio);
          boxes.push({x, y: y + h - splitH, width: w, height: splitH});
          h -= splitH + gap;
       }
       dir = (dir + 1) % 4;
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutEditorialHero(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 40;
    const gap = 24;
    const boxes = [];
    
    const heroW = Math.floor((cw - margin*2 - gap) * 0.66);
    const heroH = ch - margin*2;
    boxes.push({x: margin, y: margin, width: heroW, height: heroH});
    
    const rightX = margin + heroW + gap;
    const rightW = cw - margin*2 - heroW - gap;
    const rem = n - 1;
    
    if (rem > 0) {
      if (rem === 1) {
         boxes.push({x: rightX, y: margin, width: rightW, height: heroH});
      } else {
         const topH = Math.floor((heroH - gap) * 0.4);
         boxes.push({x: rightX, y: margin, width: rightW, height: topH});
         
         const bottomRem = rem - 1;
         const bottomY = margin + topH + gap;
         const bottomH = heroH - topH - gap;
         const cellW = Math.floor((rightW - gap * (bottomRem - 1)) / bottomRem);
         
         for(let i = 0; i < bottomRem; i++) {
             boxes.push({
               x: rightX + i*(cellW + gap), 
               y: bottomY, 
               width: cellW, 
               height: bottomH
             });
         }
      }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutZenOverlap(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 50;
    const boxes = [];
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const availW = cw - margin * 2;
    const availH = ch - margin * 2;
    const cellW = Math.floor(availW / cols);
    const cellH = Math.floor(availH / rows);
    
    for(let i = 0; i < n; i++) {
       const col = i % cols;
       const row = Math.floor(i / cols);
       const w = Math.floor(cellW * 0.65);
       const h = Math.floor(cellH * 0.75);
       
       const offsetX = (i % 2 === 0) ? cellW * 0.1 : cellW * 0.25;
       const offsetY = (i % 3 === 0) ? cellH * 0.1 : cellH * 0.2;
       
       boxes.push({
         x: margin + col * cellW + offsetX,
         y: margin + row * cellH + offsetY,
         width: w,
         height: h
       });
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutMondrian(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 0; 
    const gap = 12; 
    const boxes: {x: number, y: number, width: number, height: number}[] = [];
    
    function splitBox(box: {x: number, y: number, width: number, height: number}, splitsLeft: number, alternate: number) {
       if (splitsLeft <= 0) {
         boxes.push(box);
         return;
       }
       const splitRatio = 0.35 + (splitsLeft * 0.1) % 0.3; 
       
       if (alternate % 2 === 0) {
         const w1 = Math.floor((box.width - gap) * splitRatio);
         const w2 = box.width - gap - w1;
         splitBox({x: box.x, y: box.y, width: w1, height: box.height}, Math.floor((splitsLeft-1)/2), alternate+1);
         splitBox({x: box.x + w1 + gap, y: box.y, width: w2, height: box.height}, Math.ceil((splitsLeft-1)/2), alternate+1);
       } else {
         const h1 = Math.floor((box.height - gap) * splitRatio);
         const h2 = box.height - gap - h1;
         splitBox({x: box.x, y: box.y, width: box.width, height: h1}, Math.floor((splitsLeft-1)/2), alternate+1);
         splitBox({x: box.x, y: box.y + h1 + gap, width: box.width, height: h2}, Math.ceil((splitsLeft-1)/2), alternate+1);
       }
    }
    
    splitBox({x: margin, y: margin, width: cw - margin*2, height: ch - margin*2}, n - 1, 0);
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutRuleOfThirds(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 40;
    const gap = 20;
    const boxes = [];
    
    const mainW = Math.floor((cw - margin*2) * (2/3)) - gap;
    const mainH = Math.floor((ch - margin*2) * (2/3)) - gap;
    boxes.push({x: margin, y: margin, width: mainW, height: mainH});
    
    if (n > 1) {
        const bottomY = margin + mainH + gap;
        const bottomH = ch - margin*2 - mainH - gap;
        boxes.push({x: margin, y: bottomY, width: mainW, height: bottomH});
    }
    if (n > 2) {
        const rightX = margin + mainW + gap;
        const rightW = cw - margin*2 - mainW - gap;
        const rem = n - 2;
        const remH = Math.floor((ch - margin*2 - gap*(rem-1)) / rem);
        for(let i = 0; i < rem; i++) {
           boxes.push({x: rightX, y: margin + i*(remH + gap), width: rightW, height: remH});
        }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }

  layoutTypographic(widgets: Widget[], cw: number, ch: number) {
    const n = widgets.length;
    const margin = 30;
    const gap = 16;
    const boxes = [];
    
    const narrowW = Math.floor((cw - margin*2 - gap*2) * 0.2);
    const wideW = cw - margin*2 - gap*2 - narrowW*2;
    
    const leftCount = Math.floor(n / 3);
    const centerCount = 1;
    let rightCount = n - leftCount - centerCount;
    if (rightCount < 0) rightCount = 0;
    
    if (leftCount > 0) {
      const leftH = Math.floor((ch - margin*2 - gap*(leftCount-1)) / leftCount);
      for(let i = 0; i < leftCount; i++) {
        boxes.push({x: margin, y: margin + i*(leftH + gap), width: narrowW, height: leftH});
      }
    }
    
    boxes.push({x: margin + narrowW + gap, y: margin, width: wideW, height: ch - margin*2});
    
    if (rightCount > 0) {
      const rightX = margin + narrowW + gap + wideW + gap;
      const rightH = Math.floor((ch - margin*2 - gap*(rightCount-1)) / rightCount);
      for(let i = 0; i < rightCount; i++) {
        boxes.push({x: rightX, y: margin + i*(rightH + gap), width: narrowW, height: rightH});
      }
    }
    return this.assignCreativeBoxes(widgets, boxes);
  }
  applySelectedLayout(): void {
    if (this.selectedLayoutIndex < 0 || this.selectedLayoutIndex >= this.layoutPreviews.length) return;
    const layout = this.layoutPreviews[this.selectedLayoutIndex];
    const widgets = this.pageWidgets;
    if (layout.positions.length !== widgets.length) return;

    this.pushHistory();
    for (let i = 0; i < widgets.length; i++) {
      widgets[i].position = { ...layout.positions[i] };
    }
    this.showAutoArrangeModal = false;
    this.selectedLayoutIndex = -1;
  }

  exportConfiguration(): void {
    const payload = {
      pages: this.pages,
      widgets: this.widgets,
      backgroundConfig: this.backgroundConfig,
      customCss: this.customCss,
      audioChimesEnabled: this.audioChimesEnabled,
      hourlyChime: this.hourlyChime
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-display-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importConfiguration(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.pages && Array.isArray(data.pages)) {
          this.pages = data.pages;
        }
        if (data.widgets && Array.isArray(data.widgets)) {
          this.widgets = data.widgets;
        }
        if (data.backgroundConfig) {
          this.backgroundConfig = data.backgroundConfig;
        }
        if (data.customCss !== undefined) {
          this.customCss = data.customCss;
        }
        if (data.audioChimesEnabled !== undefined) {
          this.audioChimesEnabled = !!data.audioChimesEnabled;
        }
        if (data.hourlyChime !== undefined) {
          this.hourlyChime = !!data.hourlyChime;
        }
        this.activePageId = this.pages[0]?.id || 'default';
        this.selectedWidget = null;
        alert('Configuration imported successfully! Click Save & Publish to apply.');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  logout(): void {
    this.authService.logout();
  }
}
