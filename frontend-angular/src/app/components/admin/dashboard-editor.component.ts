import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
        <!-- User Profile & Fleet Nav Bar -->
        <div class="user-profile-bar">
          <button (click)="goToFleet()" class="btn-back-fleet" title="Back to All Displays">
            <span>‹</span> All Displays
          </button>
          <div class="user-info">
            <div class="user-avatar">{{ (currentUser?.name || 'A')[0] }}</div>
            <span class="user-email">{{ currentUser?.email || 'admin' }}</span>
          </div>
          <button (click)="logout()" class="btn-signout" title="Sign Out">Sign Out</button>
        </div>

        <!-- Brand Logo Header Slot -->
        <div class="admin-brand-card">
          <div class="brand-slot-preview" (click)="activeTab = 'settings'">
            <img *ngIf="logoUrl" [src]="logoUrl" alt="Brand Logo" class="brand-slot-img" />
            <div *ngIf="!logoUrl" class="brand-slot-empty">
              <span class="logo-text-ph">BRAND LOGO</span>
              <span class="logo-sub-ph">Click to customize</span>
            </div>
          </div>
          <div class="brand-display-meta">
            <h2 class="display-title-heading">{{ displayConfig.name }}</h2>
            <span class="res-tag">{{ canvasWidth }}×{{ canvasHeight }}</span>
          </div>
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

          <div class="palette-header">
            <h3>Add Widget</h3>
            <span class="palette-badge">19 Widgets</span>
          </div>
          <div class="widget-palette">
            <button (click)="addWidget('youtube')" class="palette-item">
              <span class="palette-icon">▶️</span>
              <span class="palette-title">YouTube</span>
            </button>
            <button (click)="addWidget('ai_briefing')" class="palette-item">
              <span class="palette-icon">🧠</span>
              <span class="palette-title">AI Briefing</span>
            </button>
            <button (click)="addWidget('chores')" class="palette-item">
              <span class="palette-icon">🏆</span>
              <span class="palette-title">Chores & Habits</span>
            </button>
            <button (click)="addWidget('camera_pip')" class="palette-item">
              <span class="palette-icon">📹</span>
              <span class="palette-title">Live Camera</span>
            </button>
            <button (click)="addWidget('commute')" class="palette-item">
              <span class="palette-icon">🚗</span>
              <span class="palette-title">Commute</span>
            </button>
            <button (click)="addWidget('clock')" class="palette-item">
              <span class="palette-icon">⏰</span>
              <span class="palette-title">Clock</span>
            </button>
            <button (click)="addWidget('weather')" class="palette-item">
              <span class="palette-icon">⛅</span>
              <span class="palette-title">Weather</span>
            </button>
            <button (click)="addWidget('calendar')" class="palette-item">
              <span class="palette-icon">📅</span>
              <span class="palette-title">Calendar</span>
            </button>
            <button (click)="addWidget('photo')" class="palette-item">
              <span class="palette-icon">🖼️</span>
              <span class="palette-title">Photos</span>
            </button>
            <button (click)="addWidget('rss')" class="palette-item">
              <span class="palette-icon">📰</span>
              <span class="palette-title">RSS News</span>
            </button>
            <button (click)="addWidget('todo')" class="palette-item">
              <span class="palette-icon">📝</span>
              <span class="palette-title">Tasks</span>
            </button>
            <button (click)="addWidget('homeassistant')" class="palette-item">
              <span class="palette-icon">🏠</span>
              <span class="palette-title">Smart Home</span>
            </button>
            <button (click)="addWidget('spotify')" class="palette-item">
              <span class="palette-icon">🎵</span>
              <span class="palette-title">Spotify</span>
            </button>
            <button (click)="addWidget('stock_crypto')" class="palette-item">
              <span class="palette-icon">📈</span>
              <span class="palette-title">Markets</span>
            </button>
            <button (click)="addWidget('sticky_note')" class="palette-item">
              <span class="palette-icon">📌</span>
              <span class="palette-title">Sticky Notes</span>
            </button>
            <button (click)="addWidget('countdown')" class="palette-item">
              <span class="palette-icon">⏳</span>
              <span class="palette-title">Countdown</span>
            </button>
            <button (click)="addWidget('meal_planner')" class="palette-item">
              <span class="palette-icon">🍽️</span>
              <span class="palette-title">Meal Plan</span>
            </button>
            <button (click)="addWidget('radar')" class="palette-item">
              <span class="palette-icon">🛰️</span>
              <span class="palette-title">Radar</span>
            </button>
            <button (click)="addWidget('quote')" class="palette-item">
              <span class="palette-icon">💬</span>
              <span class="palette-title">Daily Quote</span>
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

            <!-- Radar -->
            <ng-container *ngIf="selectedWidget.type === 'radar'">
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
                <input type="password" [(ngModel)]="selectedWidget.config.apiKey" placeholder="Leave blank to use built-in ambient engine" class="input-control" />
                <small style="font-size:0.65rem; color:#94a3b8;">Default built-in intelligence engine works with zero setup.</small>
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
              <option value="landscape_720p">Landscape 720p (1280 × 720) - Standard HD</option>
              <option value="landscape_1080p">Landscape 1080p (1920 × 1080) - Full HD</option>
              <option value="landscape_1440p">Landscape 1440p (2560 × 1440) - 2K QHD (Your Monitor)</option>
              <option value="landscape_4k">Landscape 4K (3840 × 2160) - 4K Ultra HD</option>
              <option value="portrait_720p">Portrait 720p (720 × 1280) - Vertical HD</option>
              <option value="portrait_1080p">Portrait 1080p (1080 × 1920) - Vertical Full HD</option>
              <option value="portrait_1440p">Portrait 1440p (1440 × 2560) - Vertical 2K QHD</option>
              <option value="portrait_4k">Portrait 4K (2160 × 3840) - Vertical 4K</option>
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
        </div>

        <div class="actions">
          <button (click)="saveConfiguration()" [disabled]="saving" class="btn btn-primary">
            {{ saving ? 'Saving...' : 'Save & Publish' }}
          </button>
        </div>
      </aside>

      <!-- Visual Canvas Viewport with Auto-Zoom Stage -->
      <main class="canvas-viewport" id="editorViewport" (click)="selectedWidget = null">
        <div class="canvas-stage" [style.width.px]="canvasWidth * zoomLevel" [style.height.px]="canvasHeight * zoomLevel">
          <div 
            class="screen-canvas" 
            [ngClass]="[displayConfig.theme, displayConfig.orientation || 'landscape_720p', gridSnapSize > 0 ? 'grid-overlay-' + gridSnapSize : '']" 
            [style.width.px]="canvasWidth"
            [style.height.px]="canvasHeight"
            [style.transform]="'scale(' + zoomLevel + ')'"
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
                <app-radar-widget *ngIf="widget.type === 'radar'" [config]="widget.config"></app-radar-widget>
                <app-quote-widget *ngIf="widget.type === 'quote'" [config]="widget.config"></app-quote-widget>
                <app-ai-briefing-widget *ngIf="widget.type === 'ai_briefing'" [config]="widget.config"></app-ai-briefing-widget>
                <app-chores-widget *ngIf="widget.type === 'chores'" [config]="widget.config"></app-chores-widget>
                <app-camera-pip-widget *ngIf="widget.type === 'camera_pip'" [config]="widget.config"></app-camera-pip-widget>
                <app-commute-widget *ngIf="widget.type === 'commute'" [config]="widget.config"></app-commute-widget>
                <app-youtube-widget *ngIf="widget.type === 'youtube'" [config]="widget.config"></app-youtube-widget>
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
    .btn-back-fleet {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #38bdf8;
      padding: 4px 10px;
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
  `]
})
export class DashboardEditorComponent implements OnInit, AfterViewInit {
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

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  goToFleet(): void {
    this.router.navigate(['/admin/displays']);
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
      logo_url: this.logoUrl,
      show_logo_kiosk: this.showLogoKiosk,
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
