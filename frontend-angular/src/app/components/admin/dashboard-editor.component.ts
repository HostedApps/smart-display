import { jsonSettingsError } from '../../utils/custom-widget-examples';
import { hasWidgetContentSettings } from './widget-forms/widget-content-form.component';
import { settleSecretsAfterSave, withoutSecretValues } from '../../utils/widget-secrets.util';
import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, Type, NgZone, Injector } from '@angular/core';
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
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, WidgetDefinition, getWidgetDefinition } from '../widgets/widget-registry';
import { computeStageTransform, getCanvasSize } from '../../utils/canvas-size.util';
import { LIVE_DISPLAY } from '../widgets/widget-context';
import { THEME_PRESETS, ThemePreset, ThemePresetInfo, resolveTheme, themeClasses } from '../../utils/theme.util';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { AudioChimeService } from '../../services/audio-chime.service';
import { AVAILABLE_FONTS, loadGoogleFont, getFontFamilyString, FontOption } from '../../utils/font-loader.util';
import { DASHBOARD_TEMPLATES, DashboardTemplate } from '../../utils/dashboard-templates.util';
import { SevereWeatherAlertData } from '../widgets/severe-weather-alert-banner.component';
import { NotificationService } from '../../services/notification.service';

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
            <app-icon name="book-open" [size]="14"></app-icon> Help
          </button>
          <button (click)="openInstallationGuide()" class="btn-guide-mini" title="Open Client Hardware Installation Guide (PDF)">
            <app-icon name="file-text" [size]="14"></app-icon> PDF Guide
          </button>
          <button (click)="openPasswordModal()" class="btn-password-mini" title="Change Admin Account Password">
            🔑 Password
          </button>
          <div class="user-info" (click)="openPasswordModal()" style="cursor: pointer;" title="Account: Click to change password">
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
              <app-icon name="layout-template" [size]="15"></app-icon> Templates
            </button>
            <button 
              type="button"
              class="btn-auto-arrange"
              (click)="openAutoArrangeModal()"
              [disabled]="pageWidgets.length < 2"
              title="Auto-arrange widgets into aesthetic layouts"
            >
              <app-icon name="wand-sparkles" [size]="15"></app-icon> Auto Arrange
            </button>
          </div>

          <hr class="divider" />

          <div class="palette-header">
            <button type="button" class="palette-toggle" (click)="paletteOpen = !paletteOpen" [attr.aria-expanded]="paletteOpen" aria-controls="widget-palette">
              <span class="palette-chevron" [class.open]="paletteOpen" aria-hidden="true">▸</span>
              <h3>Add Widget</h3>
            </button>
            <span class="palette-badge">{{ widgetTypeCount }} Widgets</span>
          </div>
          <div id="widget-palette" *ngIf="paletteOpen">
            <input type="search" class="input-control palette-search" [(ngModel)]="paletteQuery" placeholder="Search widgets…" aria-label="Search widgets" />
            <ng-container *ngFor="let group of paletteGroups; trackBy: trackByCategory">
              <div class="palette-category">{{ group.label }}</div>
              <div class="widget-palette">
                <button *ngFor="let def of group.widgets; trackBy: trackByType" type="button" (click)="addWidget(def.type)" class="palette-item" [title]="def.tooltip">
                  <span class="palette-icon"><app-icon [name]="def.svgIcon" [size]="16"></app-icon></span>
                  <span class="palette-title">{{ def.label }}</span>
                </button>
              </div>
            </ng-container>
            <p class="palette-empty" *ngIf="paletteGroups.length === 0">No widgets match "{{ paletteQuery }}".</p>
          </div>

          <hr class="divider" />

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
              <option value="landscape_1440p">Landscape 1440p (2560 × 1440) - 2K QHD</option>
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
            <label id="theme-picker-label">Theme</label>
            <div class="theme-grid" role="radiogroup" aria-labelledby="theme-picker-label">
              <button *ngFor="let t of themePresets" type="button" class="theme-option" role="radio"
                      [class.active]="activeTheme === t.id" [attr.aria-checked]="activeTheme === t.id"
                      (click)="selectTheme(t.id)" [title]="t.description">
                <span class="theme-swatch" [style.background]="t.swatch.canvas" aria-hidden="true">
                  <span class="theme-swatch-card" [style.background]="t.swatch.card" [style.borderColor]="t.id === 'contrast' ? '#ffffff' : 'transparent'">
                    <span class="theme-swatch-line" [style.background]="t.swatch.text"></span>
                    <span class="theme-swatch-line short" [style.background]="displayConfig.accent_color || t.swatch.accent"></span>
                  </span>
                </span>
                <span class="theme-name">{{ t.name }}</span>
              </button>
            </div>
            <p class="theme-description">{{ activeThemeInfo.description }}</p>
          </div>

          <div class="form-group">
            <label>Accent Colour</label>
            <div class="color-reset-row">
              <input type="color" [ngModel]="displayConfig.accent_color || '#38bdf8'" (ngModelChange)="setAccentColor($event)" class="input-control color-input" aria-label="Theme accent colour" />
              <button type="button" class="btn-reset-color" (click)="setAccentColor('')" [disabled]="!displayConfig.accent_color" title="Use the theme's own accent colour">Reset</button>
            </div>
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
            <div class="form-group" *ngIf="sleepSchedule.nightMode">
              <label>Night Clock Brightness ({{ ((sleepSchedule.dimLevel || 0.75) * 100) | number:'1.0-0' }}%)</label>
              <input type="range" min="0.1" max="1" step="0.05" [(ngModel)]="sleepSchedule.dimLevel" class="slider-control" />
            </div>
          </div>

          <hr class="divider" />

          <h4 class="section-heading"><app-icon name="monitor" [size]="15"></app-icon> Screen & Performance</h4>
          <div class="form-group">
            <label for="scale-mode">Fit Layout to Screen</label>
            <select id="scale-mode" [(ngModel)]="displayConfig.scale_mode" class="input-control">
              <option [ngValue]="undefined">Fit — show everything, letterbox if needed (recommended)</option>
              <option value="fill">Fill — cover the screen, edges may crop</option>
              <option value="stretch">Stretch — cover exactly, may distort</option>
              <option value="none">Actual size — 1:1 pixels from top-left</option>
            </select>
            <p class="field-hint">Your {{ canvasWidth }}×{{ canvasHeight }} layout is scaled to whatever screen the display runs on.</p>
          </div>
          <div class="form-group">
            <label for="safe-area">TV Overscan Safe Area ({{ ((displayConfig.safe_area || 0) * 100) | number:'1.0-1' }}%)</label>
            <input id="safe-area" type="range" min="0" max="0.08" step="0.005" [(ngModel)]="displayConfig.safe_area" class="slider-control" />
            <p class="field-hint">Increase if your TV cuts off the edges of the picture.</p>
          </div>
          <div class="form-group">
            <label for="page-transition">Page Transition</label>
            <select id="page-transition" [(ngModel)]="displayConfig.page_transition" class="input-control">
              <option [ngValue]="undefined">Fade (default)</option>
              <option value="slide">Slide up</option>
              <option value="zoom">Zoom</option>
              <option value="none">None</option>
            </select>
          </div>
          <div class="form-group">
            <label for="perf-mode">Performance Mode</label>
            <select id="perf-mode" [(ngModel)]="displayConfig.performance_mode" class="input-control">
              <option [ngValue]="undefined">Auto — on for Raspberry Pi and low-power devices</option>
              <option value="on">Always on — no blur or widget animations</option>
              <option value="off">Off — full effects</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [ngModel]="displayConfig.burn_in_shift !== false" (ngModelChange)="displayConfig.burn_in_shift = $event" /> Burn-in protection (shift layout a few pixels every few minutes)
            </label>
          </div>

          <hr class="divider" />

          <h4 class="section-heading"><app-icon name="triangle-alert" [size]="15"></app-icon> Severe Weather Auto-Alerts</h4>
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

          <h4 class="section-heading"><app-icon name="bell" [size]="15"></app-icon> Audio Chimes & Sound Synthesis</h4>
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

          <h4 class="section-heading"><app-icon name="tablet-smartphone" [size]="15"></app-icon> TouchHub Navigation Dock</h4>
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

          <h4 class="section-heading"><app-icon name="code" [size]="15"></app-icon> Custom CSS Overrides</h4>
          <p class="tab-desc">Inject custom CSS directly into your kiosk viewer for bespoke styling, typography, glow effects, or component layout tweaks.</p>
          <div class="form-group">
            <textarea 
              [(ngModel)]="customCss" 
              placeholder="/* Example: Custom widget border or glow */&#10;.widget-card { border-color: rgba(56, 189, 248, 0.4) !important; }" 
              class="custom-css-area"
            ></textarea>
          </div>

          <hr class="divider" />

          <h4>🔐 Change Password</h4>
          <p class="tab-desc">Update your account password. You must enter your current password to confirm the change.</p>

          <div *ngIf="passwordChangeSuccess" class="pw-success-alert">
            ✅ {{ passwordChangeSuccess }}
          </div>
          <div *ngIf="passwordChangeError" class="pw-error-alert">
            ⚠️ {{ passwordChangeError }}
          </div>

          <div class="form-group">
            <label>Current Password</label>
            <input 
              type="password" 
              [(ngModel)]="currentPassword" 
              placeholder="••••••••" 
              class="input-control" 
              autocomplete="current-password"
            />
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              [(ngModel)]="newPassword" 
              placeholder="Min 6 characters" 
              class="input-control" 
              autocomplete="new-password"
            />
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              [(ngModel)]="confirmPassword" 
              placeholder="Re-enter new password" 
              class="input-control" 
              autocomplete="new-password"
            />
          </div>
          <button 
            type="button" 
            (click)="changePassword()" 
            [disabled]="passwordChangeLoading" 
            class="btn btn-secondary full-width"
            style="margin-top: 6px;"
          >
            {{ passwordChangeLoading ? 'Changing...' : '🔑 Update Password' }}
          </button>
        </div>

        <div class="actions">
          <div class="publish-status" [class.dirty]="isDirty" role="status" aria-live="polite">
            <span class="status-dot" aria-hidden="true"></span>
            <span *ngIf="!isDirty">All changes published</span>
            <span *ngIf="isDirty">Unpublished changes<ng-container *ngIf="draftSavedAt"> · draft saved {{ draftSavedAt | date:'shortTime' }}</ng-container></span>
          </div>
          <button (click)="saveConfiguration()" [disabled]="saving" class="btn btn-primary">
            {{ saving ? 'Publishing…' : (isDirty ? 'Save & Publish' : 'Publish Again') }}
          </button>

          <div class="export-actions">
            <button (click)="openHistory()" class="btn-secondary-small"><app-icon name="history" [size]="13"></app-icon> History</button>
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
        <div class="draft-banner" *ngIf="pendingDraft" role="alert" (click)="$event.stopPropagation()">
          <app-icon name="file-text" [size]="16"></app-icon>
          <span>You have an unpublished draft from {{ pendingDraft.savedAt | date:'MMM d, h:mm a' }}.</span>
          <button type="button" class="btn-secondary-small" (click)="restoreDraft()">Restore draft</button>
          <button type="button" class="btn-link" (click)="discardDraft()">Discard</button>
        </div>
        <!-- Floating Canvas Power Toolbar (Undo, Redo, Duplication, Alignment) -->
        <div class="canvas-power-toolbar" (click)="$event.stopPropagation()">
          <div class="power-tool-group">
            <button (click)="undo()" [disabled]="!canUndo()" class="power-btn" title="Undo (Ctrl+Z / ⌘Z)">
              <app-icon name="undo-2" [size]="14"></app-icon> Undo
            </button>
            <button (click)="redo()" [disabled]="!canRedo()" class="power-btn" title="Redo (Ctrl+Y / ⌘Y)">
              <app-icon name="redo-2" [size]="14"></app-icon> Redo
            </button>
            <button (click)="showPreview = true; selectedWidget = null" class="power-btn" title="Preview on a TV, tablet or Pi screen">
              <app-icon name="play" [size]="14"></app-icon> Preview
            </button>
          </div>

          <div class="power-divider" *ngIf="selectedWidget"></div>

          <!-- Selection & Alignment Tools -->
          <div class="power-tool-group" *ngIf="selectedWidget">
            <button (click)="duplicateSelectedWidget()" class="power-btn" title="Duplicate Widget (Ctrl+D / ⌘D)">
              <app-icon name="copy-plus" [size]="14"></app-icon> Duplicate
            </button>
            <button (click)="alignSelectedWidget('left')" class="power-btn" title="Align Left">
              <app-icon name="align-horizontal-justify-start" [size]="15"></app-icon>
            </button>
            <button (click)="alignSelectedWidget('center_h')" class="power-btn" title="Center Horizontally">
              <app-icon name="align-horizontal-justify-center" [size]="15"></app-icon>
            </button>
            <button (click)="alignSelectedWidget('right')" class="power-btn" title="Align Right">
              <app-icon name="align-horizontal-justify-end" [size]="15"></app-icon>
            </button>
            <button (click)="alignSelectedWidget('top')" class="power-btn" title="Align Top">
              <app-icon name="align-vertical-justify-start" [size]="15"></app-icon>
            </button>
            <button (click)="alignSelectedWidget('center_v')" class="power-btn" title="Center Vertically">
              <app-icon name="align-vertical-justify-center" [size]="15"></app-icon>
            </button>
            <button (click)="alignSelectedWidget('bottom')" class="power-btn" title="Align Bottom">
              <app-icon name="align-vertical-justify-end" [size]="15"></app-icon>
            </button>
            <button (click)="removeSelectedWidget()" class="power-btn power-btn-danger" title="Delete Widget (Delete)">
              <app-icon name="trash-2" [size]="15"></app-icon>
            </button>
          </div>

          <div class="selected-coord-pill" *ngIf="selectedWidget">
            X: {{ selectedWidget.position.x }} · Y: {{ selectedWidget.position.y }} | {{ selectedWidget.position.width }}×{{ selectedWidget.position.height }}
          </div>
        </div>

        <div class="canvas-stage" [style.width.px]="canvasWidth * zoomLevel" [style.height.px]="canvasHeight * zoomLevel">
          <div 
            class="screen-canvas" 
            [ngClass]="canvasThemeClasses"
            [style.--sd-accent]="displayConfig.accent_color || null"
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

            <!-- Smart alignment guides while dragging -->
            <div *ngFor="let gx of activeGuides.x" class="snap-guide snap-guide-v" [style.left.px]="gx"></div>
            <div *ngFor="let gy of activeGuides.y" class="snap-guide snap-guide-h" [style.top.px]="gy"></div>

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
              [style.--sd-radius]="widget.style?.borderRadius != null ? widget.style!.borderRadius + 'px' : null"
              [style.fontFamily]="getWidgetFont(widget)"
              tabindex="0"
              role="button"
              [attr.aria-label]="(widget.customName || getWidgetTypeLabel(widget.type)) + ', ' + widget.position.width + ' by ' + widget.position.height + (widget.locked ? ', locked' : '')"
              [attr.aria-pressed]="selectedWidget === widget"
              (keydown.enter)="selectWidget(widget, $any($event))"
              (keydown.space)="$event.preventDefault(); selectWidget(widget, $any($event))"
              (pointerdown)="startDrag($event, widget)"
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

              <div class="widget-preview-content sd-widget-box"
                [class.sd-has-bg]="!!widget.style?.backgroundColor"
                [class.sd-no-blur]="widget.style?.backdropBlur === false"
                [style.--sd-widget-bg]="widget.style?.backgroundColor || null">
                <ng-container *ngComponentOutlet="widgetComponent(widget.type); inputs: { config: widget.config }"></ng-container>
              </div>

              <!-- 8-Point Visual Resize Handles -->
              <ng-container *ngIf="selectedWidget === widget && !widget.locked">
                <div class="resize-handle handle-nw" (pointerdown)="startResize($event, widget, 'nw')"></div>
                <div class="resize-handle handle-n"  (pointerdown)="startResize($event, widget, 'n')"></div>
                <div class="resize-handle handle-ne" (pointerdown)="startResize($event, widget, 'ne')"></div>
                <div class="resize-handle handle-e"  (pointerdown)="startResize($event, widget, 'e')"></div>
                <div class="resize-handle handle-se" (pointerdown)="startResize($event, widget, 'se')"></div>
                <div class="resize-handle handle-s"  (pointerdown)="startResize($event, widget, 's')"></div>
                <div class="resize-handle handle-sw" (pointerdown)="startResize($event, widget, 'sw')"></div>
                <div class="resize-handle handle-w"  (pointerdown)="startResize($event, widget, 'w')"></div>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Empty page: point people at templates -->
        <div class="canvas-empty-state" *ngIf="pageWidgets.length === 0 && !pendingDraft" (click)="$event.stopPropagation()">
          <app-icon name="layout-template" [size]="32"></app-icon>
          <h2>This page is empty</h2>
          <p>Start from one of {{ dashboardTemplates.length }} ready-made layouts, or add widgets from the palette on the left.</p>
          <button type="button" class="btn btn-primary" (click)="openTemplatesModal()"><app-icon name="layout-template" [size]="15"></app-icon> Browse templates</button>
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

      <!-- Right-hand Inspector: settings for the selected widget -->
      <aside class="inspector-panel" [class.has-selection]="!!selectedWidget" aria-label="Widget settings">
        <ng-container *ngIf="selectedWidget; else noSelection">
          <div class="inspector-head">
            <span class="inspector-icon"><app-icon [name]="widgetSvgIcon(selectedWidget.type)" [size]="18"></app-icon></span>
            <div class="inspector-title">
              <h3>{{ selectedWidget.customName || getWidgetTypeLabel(selectedWidget.type) }}</h3>
              <span class="inspector-sub">{{ getWidgetTypeLabel(selectedWidget.type) }} · {{ selectedWidget.position.width }}×{{ selectedWidget.position.height }}</span>
            </div>
            <button type="button" class="inspector-close" (click)="selectedWidget = null" aria-label="Close widget settings"><app-icon name="x" [size]="16"></app-icon></button>
          </div>

          <div class="inspector-tabs" role="tablist">
            <button type="button" role="tab" [attr.aria-selected]="inspectorTab === 'content'" [class.active]="inspectorTab === 'content'" (click)="inspectorTab = 'content'">Content</button>
            <button type="button" role="tab" [attr.aria-selected]="inspectorTab === 'style'" [class.active]="inspectorTab === 'style'" (click)="inspectorTab = 'style'">Style</button>
            <button type="button" role="tab" [attr.aria-selected]="inspectorTab === 'behaviour'" [class.active]="inspectorTab === 'behaviour'" (click)="inspectorTab = 'behaviour'">
              Behaviour
              <span class="tab-dot" *ngIf="selectedWidget.schedule?.enabled || selectedWidget.rules?.length || selectedWidget.locked || selectedWidget.hidden" aria-label="has active settings"></span>
            </button>
          </div>

          <div class="inspector-body inspector" role="tabpanel">
            <!-- CONTENT: what the widget shows -->
            <ng-container *ngIf="inspectorTab === 'content'">
              <app-widget-content-form [widget]="selectedWidget" [displayToken]="token" [changed]="recordHistory"></app-widget-content-form>
            </ng-container>

            <!-- STYLE: size, position and appearance -->
            <ng-container *ngIf="inspectorTab === 'style'">
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

                <!-- MagicMirror-style quick placement -->
                <div class="form-group">
                  <label id="region-label">Snap to Region</label>
                  <div class="region-grid" role="group" aria-labelledby="region-label">
                    <button type="button" *ngFor="let r of regions" class="region-cell" [class.bar]="r.bar" [title]="r.label" [attr.aria-label]="'Move to ' + r.label" (click)="snapToRegion(r.id)"></button>
                  </div>
                  <p class="field-hint">Top and bottom bars stretch the widget to full width.</p>
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

                <div class="form-row">
                  <div class="form-group">
                    <label>Card Background</label>
                    <div class="color-reset-row">
                      <input type="color" [ngModel]="selectedWidget.style?.backgroundColor || '#1e293b'" (ngModelChange)="setWidgetBackground($event)" class="input-control color-input" aria-label="Card background colour" />
                      <button type="button" class="btn-reset-color" (click)="setWidgetBackground('')" [disabled]="!selectedWidget.style?.backgroundColor" title="Use the theme's default card background">Reset</button>
                    </div>
                  </div>
                  <div class="form-group checkbox-group" style="margin-top: 24px;">
                    <label>
                      <input type="checkbox" [ngModel]="selectedWidget.style?.backdropBlur !== false" (ngModelChange)="setWidgetBlur($event)" /> Frosted Glass Blur
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label>Widget Font Override</label>
                  <select [ngModel]="selectedWidget.style?.fontFamily || ''" (ngModelChange)="setWidgetFont($event)" class="input-control">
                    <option value="">Default Canvas Font</option>
                    <option *ngFor="let font of availableFonts" [value]="font.id">{{ font.name }}</option>
                  </select>
                </div>


            </ng-container>

            <!-- BEHAVIOUR: layer, schedule, links and rules -->
            <ng-container *ngIf="inspectorTab === 'behaviour'">
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
                    <app-icon [name]="selectedWidget.locked ? 'lock' : 'lock-open'" [size]="14"></app-icon> {{ selectedWidget.locked ? 'Locked' : 'Unlocked' }}
                  </button>
                  <button 
                    type="button"
                    class="btn-layer-pill" 
                    [class.active]="selectedWidget.hidden" 
                    (click)="selectedWidget.hidden = !selectedWidget.hidden"
                    [title]="selectedWidget.hidden ? 'Show on canvas' : 'Hide from canvas'"
                  >
                    <app-icon [name]="selectedWidget.hidden ? 'eye-off' : 'eye'" [size]="14"></app-icon> {{ selectedWidget.hidden ? 'Hidden' : 'Visible' }}
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


                <!-- Phase 3: Linked Widget Interaction -->
                <div class="form-group">
                  <label>Linked Target Widget</label>
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
                    <label style="font-weight: 600; color: #f1f5f9; margin: 0; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;"><app-icon name="zap" [size]="14"></app-icon> Alert Rules</label>
                    <button type="button" class="btn-secondary-small" (click)="addRuleToSelectedWidget()">+ Add Rule</button>
                  </div>
                  <p class="tab-desc" style="margin-bottom: 8px;">Apply glowing neon alerts, borders, and pulse animations when data thresholds trigger.</p>

                  <div *ngIf="!selectedWidget.rules || selectedWidget.rules.length === 0" style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 4px 0;">
                    No rules active on this widget.
                  </div>

                  <div *ngFor="let rule of selectedWidget.rules; let ri = index" class="rule-item">
                    <button type="button" class="rule-delete-btn" (click)="removeRuleFromSelectedWidget(ri)" title="Delete Rule" aria-label="Delete rule"><app-icon name="x" [size]="14"></app-icon></button>
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


            </ng-container>
          </div>

          <div class="inspector-footer">
            <button type="button" (click)="duplicateSelectedWidget()" class="btn btn-secondary"><app-icon name="copy-plus" [size]="14"></app-icon> Duplicate</button>
            <button type="button" (click)="removeSelectedWidget()" class="btn btn-danger"><app-icon name="trash-2" [size]="14"></app-icon> Delete</button>
          </div>
        </ng-container>

        <ng-template #noSelection>
          <div class="inspector-empty">
            <app-icon name="mouse-pointer-click" [size]="28"></app-icon>
            <h3>No widget selected</h3>
            <p>Click a widget on the canvas to edit its content, style and schedule — or add one from the palette.</p>
            <ul class="shortcut-list">
              <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> Undo / redo</li>
              <li><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate</li>
              <li><kbd>Arrows</kbd> Nudge · <kbd>Shift</kbd> 10px</li>
              <li><kbd>Delete</kbd> Remove widget</li>
              <li><kbd>Alt</kbd> while dragging: no guides</li>
            </ul>
          </div>
        </ng-template>
      </aside>

      <!-- Preview: the current page on a chosen device, scaled exactly like the kiosk does -->
      <div class="preview-overlay" *ngIf="showPreview" role="dialog" aria-modal="true" aria-label="Display preview">
        <div class="preview-toolbar">
          <div class="preview-devices" role="radiogroup" aria-label="Preview device">
            <button *ngFor="let d of previewDevices" type="button" role="radio" [attr.aria-checked]="previewDeviceId === d.id"
                    [class.active]="previewDeviceId === d.id" (click)="previewDeviceId = d.id">
              <app-icon [name]="d.icon" [size]="15"></app-icon> {{ d.name }}
              <span class="preview-res">{{ d.width }}×{{ d.height }}</span>
            </button>
          </div>
          <button type="button" class="btn btn-secondary" (click)="showPreview = false"><app-icon name="x" [size]="14"></app-icon> Close preview</button>
        </div>
        <div class="preview-stage-area">
          <div class="preview-bezel" [style.width.px]="previewDevice.width * previewFrameScale" [style.height.px]="previewDevice.height * previewFrameScale">
            <div class="preview-screen" [ngClass]="canvasThemeClasses" [style.--sd-accent]="displayConfig.accent_color || null"
                 [style.background]="getCanvasBackgroundStyle()" [style.fontFamily]="canvasFontFamily"
                 [style.width.px]="previewDevice.width" [style.height.px]="previewDevice.height"
                 [style.transform]="'scale(' + previewFrameScale + ')'">
              <div class="preview-design-stage" [style.width.px]="canvasWidth" [style.height.px]="canvasHeight" [style.transform]="previewStageTransform">
                <div *ngFor="let widget of previewWidgets" class="preview-widget sd-widget-box"
                     [style.left.px]="widget.position.x" [style.top.px]="widget.position.y"
                     [style.width.px]="widget.position.width" [style.height.px]="widget.position.height"
                     [style.opacity]="widget.style?.opacity ?? 1"
                     [style.--sd-radius]="widget.style?.borderRadius != null ? widget.style!.borderRadius + 'px' : null"
                     [style.fontFamily]="getWidgetFont(widget)">
                  <div class="sd-widget-host" [class.sd-has-bg]="!!widget.style?.backgroundColor" [class.sd-no-blur]="widget.style?.backdropBlur === false"
                       [style.--sd-widget-bg]="widget.style?.backgroundColor || null">
                    <ng-container *ngComponentOutlet="widgetComponent(widget.type); inputs: { config: widget.config }; injector: liveInjector"></ng-container>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p class="preview-caption">{{ previewDevice.name }} · layout {{ canvasWidth }}×{{ canvasHeight }} shown with “{{ displayConfig.scale_mode || 'fit' }}” scaling. Widgets behave as on the live display.</p>
        </div>
      </div>

      <!-- Version History Modal -->
      <div class="history-backdrop" *ngIf="showHistoryModal" (click)="showHistoryModal = false">
        <div class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title" (click)="$event.stopPropagation()">
          <div class="history-head">
            <h2 id="history-title" class="section-heading"><app-icon name="history" [size]="18"></app-icon> Version History</h2>
            <button type="button" class="inspector-close" (click)="showHistoryModal = false" aria-label="Close"><app-icon name="x" [size]="16"></app-icon></button>
          </div>
          <p class="field-hint">The last 20 publishes are kept. Restoring loads a version into the editor; nothing changes on the display until you publish.</p>
          <div *ngIf="historyLoading" class="history-empty">Loading…</div>
          <div *ngIf="!historyLoading && historyVersions.length === 0" class="history-empty">No published versions yet. Each publish from now on is saved here.</div>
          <ul class="history-list" *ngIf="!historyLoading && historyVersions.length > 0">
            <li *ngFor="let v of historyVersions; let first = first">
              <div class="history-meta">
                <strong>{{ v.created_at | date:'MMM d, y · h:mm a' }}</strong>
                <span>{{ v.label || (first ? 'Current published version' : 'Published') }} · {{ v.widget_count }} widget{{ v.widget_count === 1 ? '' : 's' }}</span>
              </div>
              <button type="button" class="btn-secondary-small" (click)="restoreVersion(v)" [disabled]="first && !isDirty">Restore</button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Help & Documentation Modal -->
      <app-help-docs-modal *ngIf="showHelpModal" (closed)="showHelpModal = false"></app-help-docs-modal>

      <!-- Auto Arrange Layout Picker Modal -->
      <div class="auto-arrange-overlay" *ngIf="showAutoArrangeModal" (click)="showAutoArrangeModal = false">
        <div class="auto-arrange-modal" (click)="$event.stopPropagation()">
          <div class="auto-arrange-header">
            <div>
              <h2 class="section-heading"><app-icon name="wand-sparkles" [size]="20"></app-icon> Auto Arrange Layouts</h2>
              <p class="auto-arrange-subtitle">Choose a layout style for your {{ pageWidgets.length }} widgets</p>
            </div>
            <button class="auto-arrange-close" (click)="showAutoArrangeModal = false" aria-label="Close"><app-icon name="x" [size]="16"></app-icon></button>
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
              <h2 class="section-heading"><app-icon name="layout-template" [size]="20"></app-icon> Starter Dashboard Templates</h2>
              <p class="templates-subtitle">Jumpstart your display with pre-built, pixel-perfect curated layouts</p>
            </div>
            <button type="button" class="templates-close" (click)="showTemplatesModal = false" aria-label="Close"><app-icon name="x" [size]="16"></app-icon></button>
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
                <span class="template-theme-hint" *ngIf="tmpl.recommendedTheme">Best with the {{ tmpl.recommendedTheme | titlecase }} theme</span>
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

      <!-- Change Password Modal -->
      <div class="auto-arrange-overlay" *ngIf="showPasswordModal" (click)="closePasswordModal()">
        <div class="auto-arrange-modal" (click)="$event.stopPropagation()" style="max-width: 440px; padding: 24px;">
          <div class="auto-arrange-header" style="margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px;">
            <div>
              <h2 style="font-size: 1.15rem; color: #fff; margin: 0;">🔐 Change Account Password</h2>
              <p style="font-size: 0.8rem; color: #94a3b8; margin: 4px 0 0 0;">Update password for {{ currentUser?.email }}</p>
            </div>
            <button class="auto-arrange-close" (click)="closePasswordModal()">✕</button>
          </div>

          <div *ngIf="passwordChangeSuccess" class="pw-success-alert">
            ✅ {{ passwordChangeSuccess }}
          </div>
          <div *ngIf="passwordChangeError" class="pw-error-alert">
            ⚠️ {{ passwordChangeError }}
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label>Current Password</label>
            <input 
              type="password" 
              [(ngModel)]="currentPassword" 
              placeholder="••••••••" 
              class="input-control" 
              autocomplete="current-password"
            />
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label>New Password</label>
            <input 
              type="password" 
              [(ngModel)]="newPassword" 
              placeholder="Min 6 characters" 
              class="input-control" 
              autocomplete="new-password"
            />
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              [(ngModel)]="confirmPassword" 
              placeholder="Re-enter new password" 
              class="input-control" 
              autocomplete="new-password"
            />
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" (click)="closePasswordModal()">Cancel</button>
            <button 
              type="button" 
              class="btn btn-primary" 
              (click)="changePassword()" 
              [disabled]="passwordChangeLoading"
            >
              {{ passwordChangeLoading ? 'Updating...' : '🔑 Update Password' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./dashboard-editor.component.css', './widget-forms/widget-forms.css']
})
export class DashboardEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  token: string = '';
  saving: boolean = false;
  activeTab: 'layout' | 'layers' | 'pages' | 'settings' = 'layout';
  readonly widgetTypeCount = WIDGET_REGISTRY.length;
  paletteOpen = true;
  inspectorTab: 'content' | 'style' | 'behaviour' = 'content';


  /** MagicMirror² region names: rows top/middle/bottom × left/center/right, plus full-width bars */
  readonly regions = [
    { id: 'top_bar', label: 'Top bar', bar: true },
    { id: 'top_left', label: 'Top left' }, { id: 'top_center', label: 'Top center' }, { id: 'top_right', label: 'Top right' },
    { id: 'middle_left', label: 'Middle left' }, { id: 'middle_center', label: 'Middle center' }, { id: 'middle_right', label: 'Middle right' },
    { id: 'bottom_left', label: 'Bottom left' }, { id: 'bottom_center', label: 'Bottom center' }, { id: 'bottom_right', label: 'Bottom right' },
    { id: 'bottom_bar', label: 'Bottom bar', bar: true }
  ] as { id: string; label: string; bar?: boolean }[];

  snapToRegion(region: string): void {
    const w = this.selectedWidget;
    if (!w || w.locked) return;
    const cw = this.canvasWidth, ch = this.canvasHeight;
    const m = Math.round(Math.min(cw, ch) * 0.025);
    const p = w.position;
    if (region === 'top_bar' || region === 'bottom_bar') {
      p.width = cw - 2 * m;
      p.height = Math.min(p.height, Math.round(ch * 0.2));
      p.x = m;
      p.y = region === 'top_bar' ? m : ch - m - p.height;
    } else {
      p.width = Math.min(p.width, cw - 2 * m);
      p.height = Math.min(p.height, ch - 2 * m);
      const [row, col] = region.split('_');
      p.x = col === 'left' ? m : col === 'right' ? cw - m - p.width : Math.round((cw - p.width) / 2);
      p.y = row === 'top' ? m : row === 'bottom' ? ch - m - p.height : Math.round((ch - p.height) / 2);
    }
    this.pushHistory();
  }

  widgetSvgIcon(type: string): string {
    return getWidgetDefinition(type)?.svgIcon || 'shapes';
  }
  paletteQuery = '';

  get paletteGroups(): { id: string; label: string; widgets: WidgetDefinition[] }[] {
    const q = this.paletteQuery.trim().toLowerCase();
    const matches = (d: WidgetDefinition) => !q ||
      [d.label, d.name, d.tag, d.description].some(text => text.toLowerCase().includes(q));
    return WIDGET_CATEGORIES
      .map(c => ({ id: c.id, label: c.label, widgets: WIDGET_REGISTRY.filter(d => d.category === c.id && matches(d)) }))
      .filter(g => g.widgets.length > 0);
  }

  trackByCategory(_: number, g: { id: string }): string {
    return g.id;
  }

  trackByType(_: number, d: WidgetDefinition): string {
    return d.type;
  }

  readonly themePresets = THEME_PRESETS;

  // ---- Change tracking, drafts, history ----
  isDirty = false;
  draftSavedAt: Date | null = null;
  /** A local draft newer than the published layout, offered for restore on load */
  pendingDraft: { savedAt: string; payload: Record<string, any> } | null = null;
  showHistoryModal = false;
  historyLoading = false;
  historyVersions: { id: number; label: string | null; widget_count: number; created_at: string }[] = [];
  private lastSavedJson = '';
  private changeTimer: ReturnType<typeof setInterval> | null = null;
  private readonly beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  private get draftKey(): string {
    return `sd_editor_draft_${this.token}`;
  }

  /** Baseline after loading or publishing; the layout is "clean" until it differs from this. */
  private markSavedBaselineKeepDraft(): void {
    this.lastSavedJson = JSON.stringify(this.buildSavePayload());
    this.isDirty = false;
    this.checkForDraft();
  }

  private markSaved(): void {
    this.lastSavedJson = JSON.stringify(this.buildSavePayload());
    this.isDirty = false;
    this.draftSavedAt = null;
    try { localStorage.removeItem(this.draftKey); } catch { /* storage unavailable */ }
  }

  /** Runs every 1.5s outside Angular: detects edits and keeps a local draft so work survives a closed tab. */
  private startChangeTracking(): void {
    this.zone.runOutsideAngular(() => {
      this.changeTimer = setInterval(() => {
        if (!this.lastSavedJson) return;
        const json = JSON.stringify(this.buildSavePayload());
        const dirty = json !== this.lastSavedJson;
        if (dirty) {
          try {
            // Typed API keys and tokens are never written to browser storage
            localStorage.setItem(this.draftKey, JSON.stringify({ savedAt: new Date().toISOString(), payload: withoutSecretValues(JSON.parse(json)) }));
          } catch { /* storage full or unavailable */ }
        }
        if (dirty !== this.isDirty || dirty) {
          this.zone.run(() => {
            this.isDirty = dirty;
            if (dirty) this.draftSavedAt = new Date();
          });
        }
      }, 1500);
    });
  }

  private checkForDraft(): void {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.payload && JSON.stringify(draft.payload) !== this.lastSavedJson) {
        this.pendingDraft = draft;
      } else {
        localStorage.removeItem(this.draftKey);
      }
    } catch { /* corrupt draft: ignore */ }
  }

  restoreDraft(): void {
    if (!this.pendingDraft) return;
    this.applyPayload(this.pendingDraft.payload);
    this.pendingDraft = null;
    this.notifications.info('Draft restored. Publish when you are ready.');
  }

  discardDraft(): void {
    this.pendingDraft = null;
    try { localStorage.removeItem(this.draftKey); } catch { /* ignore */ }
  }

  /** Loads a saved payload (draft or history version) into the editor without publishing it. */
  applyPayload(p: Record<string, any>): void {
    if (!p) return;
    const d = this.displayConfig;
    for (const key of ['name', 'theme', 'orientation', 'refresh_interval', 'font_family', 'scale_mode', 'safe_area', 'page_transition', 'performance_mode', 'burn_in_shift', 'touchhub_enabled']) {
      if (p[key] !== undefined) (d as any)[key] = p[key];
    }
    d.accent_color = p['accent_color'] || undefined;
    if (p['background']) this.backgroundConfig = p['background'];
    if (p['sleep_schedule']) this.sleepSchedule = p['sleep_schedule'];
    if (Array.isArray(p['pages']) && p['pages'].length) this.pages = p['pages'];
    if (p['logo_url'] !== undefined) this.logoUrl = p['logo_url'] || '';
    if (p['show_logo_kiosk'] !== undefined) this.showLogoKiosk = !!p['show_logo_kiosk'];
    if (p['weather_alerts_enabled'] !== undefined) this.weatherAlertsEnabled = !!p['weather_alerts_enabled'];
    if (p['weather_alert'] !== undefined) this.weatherAlertText = p['weather_alert'] || '';
    if (p['custom_css'] !== undefined) this.customCss = p['custom_css'] || '';
    if (p['audio_chimes_enabled'] !== undefined) this.audioChimesEnabled = !!p['audio_chimes_enabled'];
    if (p['hourly_chime'] !== undefined) this.hourlyChime = !!p['hourly_chime'];
    if (p['touchhub_config']) {
      this.touchHubAutoHide = p['touchhub_config'].autoHide !== false;
      this.touchHubPosition = p['touchhub_config'].position || 'bottom';
    }
    if (Array.isArray(p['widgets'])) this.widgets = p['widgets'];
    if (d.orientation === 'freeform') {
      this.canvasWidth = p['canvas_width'] || this.canvasWidth;
      this.canvasHeight = p['canvas_height'] || this.canvasHeight;
    }
    this.activePageId = this.pages[0]?.id || 'default';
    this.selectedWidget = null;
    this.updateOrientation();
    this.pushHistory();
  }

  openHistory(): void {
    this.showHistoryModal = true;
    this.historyLoading = true;
    this.http.get<{ success: boolean; versions: any[] }>(`${environment.apiUrl}/display_versions.php?token=${this.token}`)
      .subscribe({
        next: res => {
          this.historyVersions = res?.versions || [];
          this.historyLoading = false;
        },
        error: () => {
          this.historyVersions = [];
          this.historyLoading = false;
          this.notifications.error('Could not load version history.');
        }
      });
  }

  async restoreVersion(v: { id: number; created_at: string }): Promise<void> {
    if (this.isDirty) {
      const ok = await this.notifications.confirm('Your unpublished changes will be replaced by this version.', { title: 'Restore this version?', confirmLabel: 'Restore' });
      if (!ok) return;
    }
    this.http.get<{ success: boolean; version: { snapshot: Record<string, any> } }>(`${environment.apiUrl}/display_versions.php?token=${this.token}&id=${v.id}`)
      .subscribe({
        next: res => {
          this.applyPayload(res.version.snapshot);
          this.showHistoryModal = false;
          this.notifications.info('Version restored in the editor. Publish to send it to the display.');
        },
        error: () => this.notifications.error('Could not load that version.')
      });
  }

  /** Problems worth a second look before publishing (not hard errors) */
  validateBeforePublish(): string[] {
    const issues: string[] = [];
    const isUrl = (v: any) => typeof v === 'string' && /^(https?|webcal):\/\/\S+$/i.test(v.trim());
    const pageName = (w: Widget) => this.pages.length > 1 ? ` on page "${this.pages.find(p => p.id === w.page_id)?.name || w.page_id}"` : '';
    for (const w of this.widgets) {
      const name = `${w.customName || this.getWidgetTypeLabel(w.type)}${pageName(w)}`;
      const p = w.position;
      if (p.x < 0 || p.y < 0 || p.x + p.width > this.canvasWidth + 1 || p.y + p.height > this.canvasHeight + 1) {
        issues.push(`${name} extends past the edge of the ${this.canvasWidth}×${this.canvasHeight} canvas.`);
      }
      const c = w.config || {};
      if (w.type === 'calendar') {
        const urls = (c['feeds'] || []).map((f: any) => f?.url).filter((u: any) => u);
        if (!urls.length && !c['icalUrl'] && !(c['customEvents'] || []).length) issues.push(`${name} has no calendar connected and will show "No calendars connected".`);
        urls.filter((u: string) => !isUrl(u)).forEach((u: string) => issues.push(`${name}: "${u}" is not a valid calendar link.`));
      }
      if (w.type === 'rss' && c['feedUrl'] && !isUrl(c['feedUrl'])) issues.push(`${name}: the feed address is not a valid URL.`);
      if (w.type === 'photo' && c['albumUrl'] && !isUrl(c['albumUrl'])) issues.push(`${name}: the album link is not a valid URL.`);
      if (w.type === 'rest_fetch' && !isUrl(c['url'])) issues.push(`${name} has no valid data URL.`);
      if (w.type === 'homeassistant' && (!c['haUrl'] || !c['token'])) issues.push(`${name} is not connected to Home Assistant yet.`);
      if (w.type === 'custom') {
        const src = c['source'] === 'url' ? String(c['url'] || '').trim() : String(c['html'] || '').trim();
        if (!src) issues.push(`${name} has no custom code yet.`);
        else if (c['source'] === 'url' && !/^https:\/\//i.test(src)) issues.push(`${name} must use an https:// link.`);
        if (jsonSettingsError(c['settings'])) issues.push(`${name}: settings are not valid JSON and will be ignored.`);
      }
    }
    return issues;
  }

  canLeave(): boolean | Promise<boolean> {
    if (!this.isDirty) return true;
    return this.notifications.confirm('You have changes that are not published yet. A draft is kept in this browser.', { title: 'Leave the editor?', confirmLabel: 'Leave' });
  }

  ngOnDestroy(): void {
    if (this.changeTimer) clearInterval(this.changeTimer);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  get activeTheme(): ThemePreset {
    return resolveTheme(this.displayConfig?.theme);
  }

  get activeThemeInfo(): ThemePresetInfo {
    return THEME_PRESETS.find(t => t.id === this.activeTheme) || THEME_PRESETS[0];
  }

  get canvasThemeClasses(): string[] {
    return [
      ...themeClasses(this.displayConfig?.theme),
      this.displayConfig?.orientation || 'landscape_720p',
      this.gridSnapSize > 0 ? 'grid-overlay-' + this.gridSnapSize : ''
    ];
  }

  selectTheme(id: ThemePreset): void {
    this.displayConfig.theme = id;
  }

  /** Templates designed for a specific look (e.g. Mirror) switch the theme, and say so */
  private adoptRecommendedTheme(tmpl: DashboardTemplate): void {
    if (tmpl.recommendedTheme && this.activeTheme !== tmpl.recommendedTheme) {
      this.displayConfig.theme = tmpl.recommendedTheme;
      const name = THEME_PRESETS.find(t => t.id === tmpl.recommendedTheme)?.name || tmpl.recommendedTheme;
      this.notifications.info(`Theme switched to ${name} to suit this template. Change it any time in Settings.`);
    }
  }

  // ---- Preview mode ----
  showPreview = false;
  previewDeviceId = 'tv';
  readonly previewDevices = [
    { id: 'tv', name: 'TV 1080p', icon: 'tv', width: 1920, height: 1080 },
    { id: 'tv4k', name: 'TV 4K', icon: 'tv', width: 3840, height: 2160 },
    { id: 'portrait', name: 'Portrait', icon: 'monitor-smartphone', width: 1080, height: 1920 },
    { id: 'ipad', name: 'iPad', icon: 'tablet', width: 2048, height: 1536 },
    { id: 'pi', name: 'Pi 7" screen', icon: 'monitor', width: 800, height: 480 },
    { id: 'laptop', name: 'Laptop', icon: 'laptop', width: 1440, height: 900 }
  ];
  /** Widgets inside the preview behave like on a real display (no sample data, live states) */
  readonly liveInjector = Injector.create({ providers: [{ provide: LIVE_DISPLAY, useValue: true }], parent: this.injector });

  get previewDevice() {
    return this.previewDevices.find(d => d.id === this.previewDeviceId) || this.previewDevices[0];
  }

  /** Device screen shrunk to fit the preview area */
  get previewFrameScale(): number {
    const d = this.previewDevice;
    const maxW = Math.max(320, window.innerWidth - 160);
    const maxH = Math.max(240, window.innerHeight - 220);
    return Math.min(maxW / d.width, maxH / d.height);
  }

  /** Same placement maths the kiosk uses (Fit/Fill/Stretch + safe area) */
  get previewStageTransform(): string {
    const d = this.previewDevice;
    const t = computeStageTransform({ width: this.canvasWidth, height: this.canvasHeight }, { width: d.width, height: d.height },
      this.displayConfig.scale_mode || 'fit', this.displayConfig.safe_area || 0);
    return `translate(${t.offsetX}px, ${t.offsetY}px) scale(${t.scaleX}, ${t.scaleY})`;
  }

  get previewWidgets(): Widget[] {
    return this.pageWidgets.filter(w => !w.hidden);
  }

  setAccentColor(color: string): void {
    this.displayConfig.accent_color = color || undefined;
  }

  widgetComponent(type: string): Type<unknown> | null {
    return getWidgetDefinition(type)?.component ?? null;
  }
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
    dimLevel: 0.75
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

  // Password Change
  showPasswordModal: boolean = false;
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordChangeLoading: boolean = false;
  passwordChangeSuccess: string = '';
  passwordChangeError: string = '';

  openPasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordChangeSuccess = '';
    this.passwordChangeError = '';
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  changePassword(): void {
    this.passwordChangeSuccess = '';
    this.passwordChangeError = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordChangeError = 'All password fields are required';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordChangeError = 'New password must be at least 6 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordChangeError = 'New passwords do not match';
      return;
    }
    if (this.currentPassword === this.newPassword) {
      this.passwordChangeError = 'New password must be different from current password';
      return;
    }

    this.passwordChangeLoading = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.passwordChangeLoading = false;
        if (res.success) {
          this.passwordChangeSuccess = res.message || 'Password changed successfully';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          if (this.showPasswordModal) {
            setTimeout(() => {
              this.showPasswordModal = false;
            }, 1500);
          }
        } else {
          this.passwordChangeError = res.error || 'Failed to change password';
        }
      },
      error: (err) => {
        this.passwordChangeLoading = false;
        this.passwordChangeError = err.error?.error || 'Failed to change password. Please try again.';
      }
    });
  }

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

  async applyTemplateToCurrentPage(tmpl: DashboardTemplate): Promise<void> {
    if (this.pageWidgets.length > 0) {
      const confirmed = await this.notifications.confirm(
        `This will replace the ${this.pageWidgets.length} widgets on the current page. You can undo afterwards.`,
        { title: `Apply "${tmpl.name}"?`, confirmLabel: 'Apply template' }
      );
      if (!confirmed) {
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
    this.adoptRecommendedTheme(tmpl);
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
    this.adoptRecommendedTheme(tmpl);
    this.pushHistory();
  }

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private chimeService: AudioChimeService,
    private notifications: NotificationService,
    private zone: NgZone,
    private injector: Injector
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

            if (res.display.orientation === 'freeform') {
              this.canvasWidth = res.display.canvas_width || 1024;
              this.canvasHeight = res.display.canvas_height || 1024;
            }
            this.updateOrientation();
            this.markSavedBaselineKeepDraft();
          }
        });
    }

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    this.startChangeTracking();

    // Pointer events cover mouse, touch and pen, so the canvas works on tablets too
    window.addEventListener('pointermove', (e) => this.onMouseMove(e));
    window.addEventListener('pointerup', () => this.stopDragOrResize());
    window.addEventListener('pointercancel', () => this.stopDragOrResize());
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
    const size = getCanvasSize(this.displayConfig.orientation, { width: this.canvasWidth, height: this.canvasHeight });
    this.canvasWidth = size.width;
    this.canvasHeight = size.height;

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
    if (this.selectedWidget !== widget) {
      this.inspectorTab = hasWidgetContentSettings(widget.type) ? 'content' : 'style';
    }
    this.selectedWidget = widget;
  }

  addWidget(type: Widget['type']): void {
    const def = getWidgetDefinition(type);
    const initialConfig = def ? def.defaultConfig() : {};
    const initialSize = def ? def.defaultSize : { width: 320, height: 200 };

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
    this.inspectorTab = 'content';
    this.pushHistory();
  }

  removeSelectedWidget(): void {
    if (!this.selectedWidget) return;
    this.widgets = this.widgets.filter(w => w !== this.selectedWidget);
    this.selectedWidget = null;
    this.pushHistory();
  }

  getWidgetOpacity(): number {
    return Math.round(((this.selectedWidget?.style?.opacity !== undefined ? this.selectedWidget.style.opacity : 1)) * 100);
  }

  setWidgetOpacity(val: number): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.opacity = Number(val);
  }

  setWidgetBackground(color: string): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.backgroundColor = color || undefined;
  }

  setWidgetBlur(enabled: boolean): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.backdropBlur = enabled;
    this.pushHistory();
  }

  setWidgetRadius(val: number): void {
    if (!this.selectedWidget) return;
    if (!this.selectedWidget.style) this.selectedWidget.style = {};
    this.selectedWidget.style.borderRadius = Number(val);
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

  startDrag(event: PointerEvent, widget: Widget): void {
    if (this.isResizing || widget.locked) return;
    this.isDragging = true;
    this.selectedWidget = widget;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.widgetStartX = widget.position.x;
    this.widgetStartY = widget.position.y;
  }

  startResize(event: PointerEvent, widget: Widget, handle: string): void {
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
    return getWidgetDefinition(type)?.name || (type ? type.toUpperCase() : 'Widget');
  }

  onMouseMove(event: PointerEvent): void {
    if (!this.selectedWidget) return;

    const zoom = this.zoomLevel || 1.0;

    if (this.isDragging) {
      const dx = (event.clientX - this.dragStartX) / zoom;
      const dy = (event.clientY - this.dragStartY) / zoom;

      const w = this.selectedWidget.position.width;
      const h = this.selectedWidget.position.height;
      let x = this.snap(Math.max(0, Math.min(this.canvasWidth - w, this.widgetStartX + dx)));
      let y = this.snap(Math.max(0, Math.min(this.canvasHeight - h, this.widgetStartY + dy)));

      // Smart guides: align left/centre/right and top/middle/bottom with other widgets and the canvas
      this.activeGuides = { x: [], y: [] };
      if (!event.altKey) {
        const gx = this.findGuideSnap([x, x + w / 2, x + w], this.guideTargets('x'));
        const gy = this.findGuideSnap([y, y + h / 2, y + h], this.guideTargets('y'));
        if (gx) { x = Math.max(0, Math.min(this.canvasWidth - w, x + gx.delta)); this.activeGuides.x = [gx.line]; }
        if (gy) { y = Math.max(0, Math.min(this.canvasHeight - h, y + gy.delta)); this.activeGuides.y = [gy.line]; }
      }
      this.selectedWidget.position.x = Math.round(x);
      this.selectedWidget.position.y = Math.round(y);
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

      newX = this.snap(newX);
      newY = this.snap(newY);
      newW = this.snap(newW);
      newH = this.snap(newH);

      // Smart guides for the edges being dragged
      this.activeGuides = { x: [], y: [] };
      if (!event.altKey) {
        if (this.resizeHandle.includes('e')) {
          const g = this.findGuideSnap([newX + newW], this.guideTargets('x'));
          if (g && newW + g.delta >= minW) { newW += g.delta; this.activeGuides.x = [g.line]; }
        } else if (this.resizeHandle.includes('w')) {
          const g = this.findGuideSnap([newX], this.guideTargets('x'));
          if (g && newW - g.delta >= minW && newX + g.delta >= 0) { newX += g.delta; newW -= g.delta; this.activeGuides.x = [g.line]; }
        }
        if (this.resizeHandle.includes('s')) {
          const g = this.findGuideSnap([newY + newH], this.guideTargets('y'));
          if (g && newH + g.delta >= minH) { newH += g.delta; this.activeGuides.y = [g.line]; }
        } else if (this.resizeHandle.includes('n')) {
          const g = this.findGuideSnap([newY], this.guideTargets('y'));
          if (g && newH - g.delta >= minH && newY + g.delta >= 0) { newY += g.delta; newH -= g.delta; this.activeGuides.y = [g.line]; }
        }
      }

      this.selectedWidget.position.x = Math.round(newX);
      this.selectedWidget.position.y = Math.round(newY);
      this.selectedWidget.position.width = Math.round(newW);
      this.selectedWidget.position.height = Math.round(newH);
    }
  }

  /** Alignment lines currently snapped to while dragging/resizing (canvas px) */
  activeGuides: { x: number[]; y: number[] } = { x: [], y: [] };
  private static readonly GUIDE_THRESHOLD_SCREEN_PX = 6;

  /** Edges and centres of the canvas and of every other visible widget on this page */
  private guideTargets(axis: 'x' | 'y'): number[] {
    const size = axis === 'x' ? this.canvasWidth : this.canvasHeight;
    const targets = [0, size / 2, size];
    for (const w of this.pageWidgets) {
      if (w === this.selectedWidget || w.hidden) continue;
      const start = axis === 'x' ? w.position.x : w.position.y;
      const len = axis === 'x' ? w.position.width : w.position.height;
      targets.push(start, start + len / 2, start + len);
    }
    return targets;
  }

  /** Closest target within the threshold for any of the moving edges; delta moves the edge onto the line */
  private findGuideSnap(edges: number[], targets: number[]): { delta: number; line: number } | null {
    const threshold = DashboardEditorComponent.GUIDE_THRESHOLD_SCREEN_PX / (this.zoomLevel || 1);
    let best: { delta: number; line: number } | null = null;
    for (const edge of edges) {
      for (const t of targets) {
        const d = t - edge;
        if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) {
          best = { delta: d, line: t };
        }
      }
    }
    return best;
  }

  stopDragOrResize(): void {
    if (this.isDragging || this.isResizing) {
      this.pushHistory();
    }
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = '';
    this.activeGuides = { x: [], y: [] };
  }

  /** Passed to widget settings forms: they call it after adding or removing list items */
  readonly recordHistory = (): void => this.pushHistory();

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

  /** Everything save_display.php stores; also used for change tracking, drafts and history. */
  buildSavePayload(): Record<string, any> {
    return {
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
      accent_color: this.displayConfig.accent_color || '',
      canvas_width: this.canvasWidth,
      canvas_height: this.canvasHeight,
      scale_mode: this.displayConfig.scale_mode || 'fit',
      safe_area: this.displayConfig.safe_area || 0,
      page_transition: this.displayConfig.page_transition || 'fade',
      performance_mode: this.displayConfig.performance_mode || 'auto',
      burn_in_shift: this.displayConfig.burn_in_shift !== false,
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
  }

  async saveConfiguration(): Promise<void> {
    const issues = this.validateBeforePublish();
    if (issues.length > 0) {
      const proceed = await this.notifications.confirm(
        issues.map(i => '• ' + i).join('\n'),
        { title: `Publish with ${issues.length} issue${issues.length === 1 ? '' : 's'}?`, confirmLabel: 'Publish anyway' }
      );
      if (!proceed) return;
    }
    this.saving = true;
    const payload = this.buildSavePayload();

    this.http.post<{ success: boolean; id_map?: Record<string, number>; secrets_stored?: boolean }>(`${environment.apiUrl}/save_display.php`, payload)
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.applySavedWidgetIds(res?.id_map);
          // Only once the server confirms it stored them: older servers keep secrets in config,
          // and clearing them here would erase them on the next save
          if (res?.secrets_stored) settleSecretsAfterSave(this.widgets);
          this.markSaved();
          this.notifications.success('Layout and settings published to the display.');
        },
        error: (err) => {
          this.saving = false;
          this.notifications.error('Failed to save layout: ' + (err.error?.error || err.message));
        }
      });
  }

  /** New widgets get database ids on save; adopt them so later saves update instead of re-inserting. */
  private applySavedWidgetIds(idMap?: Record<string, number>): void {
    if (!idMap || Object.keys(idMap).length === 0) return;
    for (const w of this.widgets) {
      const newId = idMap[String(w.id)];
      if (newId) w.id = newId;
      if (w.linkedWidgetId != null && idMap[String(w.linkedWidgetId)]) {
        w.linkedWidgetId = idMap[String(w.linkedWidgetId)];
      }
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
        this.notifications.info('Configuration imported. Click Save & Publish to apply it.');
      } catch (err) {
        this.notifications.error('That file is not a valid Smart Display JSON export.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  logout(): void {
    this.authService.logout();
  }
}
