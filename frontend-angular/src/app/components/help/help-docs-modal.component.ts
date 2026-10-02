import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-help-docs-modal',
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="help-icon-badge">📖</div>
            <div>
              <h2 class="modal-title">Documentation & Help Center</h2>
              <p class="modal-subtitle">Platform guides, widget documentation, and hardware installation manuals</p>
            </div>
          </div>

          <div class="header-right">
            <button (click)="openPdfManual()" class="btn-pdf-header" title="Open and print the complete multi-platform manual">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              PDF Hardware Guide
            </button>
            <button (click)="close()" class="btn-close">✕</button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="help-tabs">
          <button [class.active]="activeTab === 'quickstart'" (click)="activeTab = 'quickstart'">
            🚀 Quick Start
          </button>
          <button [class.active]="activeTab === 'widgets'" (click)="activeTab = 'widgets'">
            🧩 {{ widgetCatalog.length }}-Widget Catalog
          </button>
          <button [class.active]="activeTab === 'hardware'" (click)="activeTab = 'hardware'">
            🛠️ Hardware & Kiosks
          </button>
          <button [class.active]="activeTab === 'walldrop'" (click)="activeTab = 'walldrop'">
            📲 WallDrop & Alerts
          </button>
          <button [class.active]="activeTab === 'tips'" (click)="activeTab = 'tips'">
            💡 Editor Tips & Zoom
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="modal-body">
          <!-- TAB 1: QUICK START -->
          <div *ngIf="activeTab === 'quickstart'" class="tab-pane">
            <div class="guide-banner">
              <h3>Welcome to Smart Display Enterprise</h3>
              <p>Follow this 3-step workflow to design, customize, and launch your smart display wall screens in under 2 minutes.</p>
            </div>

            <div class="flow-steps">
              <div class="flow-card">
                <div class="step-badge">1</div>
                <h4>Create Your Screen</h4>
                <p>Click <strong>"+ New Display"</strong> in the Fleet Hub. Give it a name (e.g. <em>Office 2K Monitor</em> or <em>Kitchen iPad</em>) and choose your screen orientation & resolution (1080p, 2560×1440 2K QHD, 4K UHD, or Vertical Portrait).</p>
              </div>

              <div class="flow-card">
                <div class="step-badge">2</div>
                <h4>Design in Visual Canvas</h4>
                <p>Click <strong>"Edit Canvas"</strong>. Drag & drop widgets from the 19-widget palette. Resize widgets with 8-point handles, pick custom backgrounds (Unsplash, Video, YouTube ambient streams), and set sleep/wake schedules.</p>
              </div>

              <div class="flow-card">
                <div class="step-badge">3</div>
                <h4>Pair Any Screen via PIN</h4>
                <p>On your Raspberry Pi, iPad, or Fire TV, navigate to <code>/#/pair</code>. Note the 6-digit code (e.g. <code>UP-4821</code>) and click <strong>"⚡ Pair Screen with PIN"</strong> from your Fleet Hub to instantly bond the screen!</p>
              </div>
            </div>

            <div class="pdf-callout-box">
              <div class="pdf-callout-icon">📄</div>
              <div class="pdf-callout-text">
                <strong>Need step-by-step physical installation instructions?</strong>
                <p>Download or print the comprehensive field installation PDF covering autostart scripts, systemd, audio volume, and HDMI overscan.</p>
              </div>
              <button (click)="openPdfManual()" class="btn-pdf-action">View Installation PDF</button>
            </div>
          </div>

          <!-- TAB 2: WIDGET CATALOG -->
          <div *ngIf="activeTab === 'widgets'" class="tab-pane">
            <div class="search-bar-wrap">
              <input type="text" [(ngModel)]="widgetSearch" placeholder="Search widgets (e.g. Weather, YouTube, Spotify, Chores)..." class="widget-search-input" />
            </div>

            <div class="widget-grid">
              <div *ngFor="let w of filteredWidgets" class="widget-card">
                <div class="widget-card-header">
                  <span class="widget-icon">{{ w.icon }}</span>
                  <span class="widget-title">{{ w.title }}</span>
                  <span class="widget-tag">{{ w.tag }}</span>
                </div>
                <p class="widget-desc">{{ w.description }}</p>
                <div class="widget-config-hint">
                  <strong>Key Settings:</strong> {{ w.configTips }}
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: HARDWARE & KIOSKS -->
          <div *ngIf="activeTab === 'hardware'" class="tab-pane">
            <div class="platform-cards">
              <div class="platform-card">
                <div class="platform-header">
                  <span class="platform-icon">🥧</span>
                  <h4>Raspberry Pi (3 / 4 / 5)</h4>
                </div>
                <p>Run Chromium in fullscreen kiosk mode on boot. Supports native 1080p, 2560×1440 2K, and 4K screens.</p>
                <code>chromium-browser --kiosk --autoplay-policy=no-user-gesture-required https://.../#/display/TOKEN</code>
              </div>

              <div class="platform-card">
                <div class="platform-header">
                  <span class="platform-icon">📺</span>
                  <h4>Amazon Fire TV & Fire Stick</h4>
                </div>
                <p>Open in Amazon Silk Browser (Menu ➔ Fullscreen) or sideload Fully Kiosk Browser APK via Downloader code <strong>356512</strong>.</p>
              </div>

              <div class="platform-card">
                <div class="platform-header">
                  <span class="platform-icon">📱</span>
                  <h4>Apple iPad & iPadOS</h4>
                </div>
                <p>Open Safari ➔ Share ➔ <strong>"Add to Home Screen"</strong> ➔ Enable <strong>iOS Guided Access</strong> for 24/7 dedicated wall kiosk lock.</p>
              </div>

              <div class="platform-card">
                <div class="platform-header">
                  <span class="platform-icon">🤖</span>
                  <h4>Android Tablets</h4>
                </div>
                <p>Install Chrome PWA or Fully Kiosk Browser from Play Store. Enable App Pinning to lock the screen permanently.</p>
              </div>
            </div>

            <div class="pdf-callout-box">
              <div class="pdf-callout-icon">🖨️</div>
              <div class="pdf-callout-text">
                <strong>Complete Hardware Deployment Manual (Printable / PDF)</strong>
                <p>Includes autostart desktop entries, systemd service units, audio configuration, and DPMS sleep prevention.</p>
              </div>
              <button (click)="openPdfManual()" class="btn-pdf-action">Open Printable PDF Guide</button>
            </div>
          </div>

          <!-- TAB 4: WALLDROP & EMERGENCY -->
          <div *ngIf="activeTab === 'walldrop'" class="tab-pane">
            <div class="feature-two-col">
              <div class="feature-card">
                <div class="feature-header">
                  <span class="feature-icon">📲</span>
                  <h4>"WallDrop" Mobile Beam Portal</h4>
                </div>
                <p>WallDrop allows anyone with the screen link or QR code to instantly beam notes and photo polaroids to your wall screen with zero logins required!</p>
                <ul class="feature-list">
                  <li><strong>URL:</strong> <code>https://.../#/drop/:token</code></li>
                  <li><strong>Post-It Notes:</strong> Pick sticky note color (Amber, Pink, Cyan, Emerald) and post messages.</li>
                  <li><strong>Photo Polaroids:</strong> Beam family pictures, tickets, and camera uploads in real-time.</li>
                </ul>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <span class="feature-icon">🚨</span>
                  <h4>1-Click Fleet Emergency Takeover</h4>
                </div>
                <p>Instantly broadcast high-priority safety warnings or family announcements across every connected screen in your fleet.</p>
                <ul class="feature-list">
                  <li><strong>Amber / Red Strobe Border:</strong> Flashing perimeter alert catches immediate attention.</li>
                  <li><strong>Web Audio Siren:</strong> Synthesizes an emergency chime through device speakers.</li>
                  <li><strong>Targeting:</strong> Broadcast fleet-wide or target specific individual screens.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- TAB 5: TIPS & ZOOM -->
          <div *ngIf="activeTab === 'tips'" class="tab-pane">
            <div class="tips-grid">
              <div class="tip-card">
                <h4>🔍 Auto-Fit Zoom & Artboard Staging</h4>
                <p>When designing 1440p (2560×1440) or 4K layouts on smaller laptop screens, the canvas automatically calculates viewport bounds so nothing is cut off. Use the floating bottom toolbar to switch between <strong>Fit %</strong>, <strong>50%</strong>, <strong>75%</strong>, and <strong>100% (1:1 Native)</strong>.</p>
              </div>

              <div class="tip-card">
                <h4>📐 Grid Snapping & Pixel Alignment</h4>
                <p>Toggle <strong>10px</strong> or <strong>20px Grid Snapping</strong> in the top-left toolbar to effortlessly align widgets with exact spacing.</p>
              </div>

              <div class="tip-card">
                <h4>🌙 Ambient Sleep & Night Mode</h4>
                <p>Configure automated sleep hours (e.g. 23:00 to 06:30). Choose between true OLED blackout or minimal red ambient night clock mode.</p>
              </div>

              <div class="tip-card">
                <h4>🔄 Multi-Screen Page Carousel</h4>
                <p>Add multiple pages (e.g. Page 1: Morning Briefing, Page 2: Family Chores & Calendar) and set a rotation interval (e.g. 30s) for a dynamic cycling display.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <div class="footer-left">
            <span>Tip: Press <strong>Esc</strong> to dismiss this help window anytime.</span>
          </div>
          <div class="footer-right">
            <button (click)="openPdfManual()" class="btn btn-secondary">
              📄 View Full PDF Guide
            </button>
            <button (click)="close()" class="btn btn-primary">Got it</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 13, 0.85);
      backdrop-filter: blur(12px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      width: 100%;
      max-width: 960px;
      max-height: 90vh;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(20px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* Header */
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.2);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .help-icon-badge {
      width: 44px;
      height: 44px;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.3);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .modal-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 3px 0 0 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-pdf-header {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-pdf-header:hover {
      background: #0ea5e9;
      color: #ffffff;
    }
    .btn-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .btn-close:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Tabs */
    .help-tabs {
      display: flex;
      padding: 10px 24px 0 24px;
      background: rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
      overflow-x: auto;
    }
    .help-tabs button {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 10px 14px;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .help-tabs button:hover {
      color: #ffffff;
    }
    .help-tabs button.active {
      color: #38bdf8;
      border-bottom-color: #0ea5e9;
    }

    /* Body */
    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    .tab-pane {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Quick Start */
    .guide-banner {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(15, 23, 42, 0.4));
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 14px;
      padding: 18px 22px;
    }
    .guide-banner h3 {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 6px 0;
    }
    .guide-banner p {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.4;
    }
    .flow-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .flow-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 18px;
      position: relative;
    }
    .step-badge {
      width: 26px;
      height: 26px;
      background: #0ea5e9;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .flow-card h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    .flow-card p {
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.45;
      margin: 0;
    }

    .pdf-callout-box {
      background: rgba(56, 189, 248, 0.08);
      border: 1px dashed rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .pdf-callout-icon {
      font-size: 1.8rem;
    }
    .pdf-callout-text {
      flex: 1;
    }
    .pdf-callout-text strong {
      font-size: 0.88rem;
      color: #f1f5f9;
      display: block;
    }
    .pdf-callout-text p {
      font-size: 0.78rem;
      color: #94a3b8;
      margin: 2px 0 0 0;
    }
    .btn-pdf-action {
      background: #0ea5e9;
      border: none;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-pdf-action:hover {
      background: #0284c7;
    }

    /* Widget Catalog */
    .search-bar-wrap {
      margin-bottom: 10px;
    }
    .widget-search-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    .widget-search-input:focus {
      border-color: #0ea5e9;
    }
    .widget-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      max-height: 480px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .widget-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .widget-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .widget-icon {
      font-size: 1.2rem;
    }
    .widget-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
      flex: 1;
    }
    .widget-tag {
      font-size: 0.65rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .widget-desc {
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.35;
      margin: 0;
    }
    .widget-config-hint {
      font-size: 0.72rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    /* Hardware Cards */
    .platform-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .platform-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .platform-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .platform-icon {
      font-size: 1.3rem;
    }
    .platform-header h4 {
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .platform-card p {
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.35;
      margin: 0;
    }
    .platform-card code {
      font-size: 0.68rem;
      word-break: break-all;
      background: #070a12;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #38bdf8;
    }

    /* Feature Two Col */
    .feature-two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .feature-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 18px;
    }
    .feature-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .feature-icon {
      font-size: 1.3rem;
    }
    .feature-header h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .feature-card p {
      font-size: 0.8rem;
      color: #cbd5e1;
      line-height: 1.4;
      margin: 0 0 10px 0;
    }
    .feature-list {
      margin: 0;
      padding-left: 18px;
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* Tips Grid */
    .tips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .tip-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
    }
    .tip-card h4 {
      font-size: 0.88rem;
      font-weight: 700;
      color: #38bdf8;
      margin: 0 0 8px 0;
    }
    .tip-card p {
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }

    /* Footer */
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.25);
    }
    .footer-left {
      font-size: 0.75rem;
      color: #64748b;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .btn-primary {
      background: #0ea5e9;
      border: none;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0284c7;
    }

    @media (max-width: 768px) {
      .modal-backdrop {
        padding: 10px;
      }
      .modal-container {
        max-height: 94vh;
        border-radius: 14px;
      }
      .modal-header {
        padding: 14px 16px;
      }
      .help-tabs {
        padding: 8px 12px 0 12px;
      }
      .help-tabs button {
        padding: 8px 10px;
        font-size: 0.78rem;
      }
      .modal-body {
        padding: 16px;
      }
      .flow-steps, .platform-cards, .feature-two-col, .tips-grid {
        grid-template-columns: 1fr;
      }
      .widget-grid {
        grid-template-columns: 1fr;
      }
      .modal-footer {
        padding: 12px 16px;
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
      }
      .footer-right {
        justify-content: flex-end;
      }
    }
  `]
})
export class HelpDocsModalComponent {
  @Output() closed = new EventEmitter<void>();

  activeTab: 'quickstart' | 'widgets' | 'hardware' | 'walldrop' | 'tips' = 'quickstart';
  widgetSearch: string = '';

  widgetCatalog = [
    { icon: '▶️', title: 'YouTube Video & Stream', tag: 'Media', description: 'Embeds ambient videos, live news, and music streams with autoplay and loop controls.', configTips: 'Accepts standard watch URLs, youtu.be, shorts, or raw Video IDs.' },
    { icon: '🧠', title: 'AI Ambient Briefing', tag: 'AI Engine', description: 'Generates daily synthesized morning and evening executive updates using Google Gemini or built-in heuristics.', configTips: 'Customize tone (Warm, Executive, Motivational) or provide Gemini API Key.' },
    { icon: '🏆', title: 'Chores & Habit Streaks', tag: 'Gamification', description: 'Interactive Hearth-style family chore charts with avatar emojis, flame streaks, and confetti rewards.', configTips: 'Add family members, allocate points per task, and tap to complete.' },
    { icon: '📹', title: 'Live Camera PIP', tag: 'Security', description: 'Low-latency RTSP/MJPEG live doorbell and security camera PIP stream with snapshot refresh HUD.', configTips: 'Configure stream URL or image snapshot endpoint with refresh interval.' },
    { icon: '🚗', title: 'Commute & Transit', tag: 'Transit', description: 'Real-time driving traffic ETA matrices and public transit live departure countdowns.', configTips: 'Add destinations (Office, Airport, School) with route badges.' },
    { icon: '⏰', title: 'Digital Clock', tag: 'Core', description: 'Precision digital clock with 12h/24h formats, date display, and typography styling.', configTips: 'Supports multiple time formats (hh:mm:ss a, HH:mm).' },
    { icon: '⛅', title: 'Weather Forecast', tag: 'Weather', description: 'Current temperature, weather condition icons, humidity, wind, and 5-day forecasts.', configTips: 'City Name, Imperial (°F) or Metric (°C), and OpenWeather API Key.' },
    { icon: '📅', title: 'Family Calendar', tag: 'Scheduling', description: 'Monthly calendar grid and agenda list synchronized with Google Calendar, iCloud, and Outlook via iCal.', configTips: 'Paste public/secret iCal URLs from Google/Apple Calendar.' },
    { icon: '🖼️', title: 'Photo Slideshow & Google Photos', tag: 'Media', description: 'Rotating family photo album slideshow and live streaming from Google Photos shared albums.', configTips: 'Paste any Google Photos shared link (e.g. photos.app.goo.gl) or custom image URLs.' },
    { icon: '📰', title: 'RSS News Feed', tag: 'Information', description: 'Live headline ticker pulling from major news outlets, tech blogs, and custom RSS feeds.', configTips: 'Enter any valid RSS XML endpoint URL (e.g. BBC, NYT, Hacker News).' },
    { icon: '📝', title: 'Tasks & To-Do', tag: 'Productivity', description: 'Shared family or office checklist with strike-through completion.', configTips: 'Add checklist items directly or sync with task managers.' },
    { icon: '🏠', title: 'Smart Home & Home Assistant', tag: 'Smart Home', description: 'Displays live entity states, lights, sensors, thermostat gauges from Home Assistant, Google Home, Alexa, or custom virtual devices.', configTips: 'Home Assistant URL & token or custom smart entities.' },
    { icon: '🎵', title: 'Spotify Now Playing', tag: 'Music', description: 'Shows active track artwork, artist name, progress bar, and playback status.', configTips: 'OAuth connection or simulated ambient music player mode.' },
    { icon: '📈', title: 'Markets & Stocks Ticker', tag: 'Finance', description: 'Live ticker tracking for US & Global Stocks (AAPL, TSLA, NVDA, SPY, MSFT, GOOGL) and Cryptocurrencies (BTC, ETH, SOL) with sparklines and % change.', configTips: 'Enter comma-separated stock symbols (e.g. AAPL, NVDA, SPY) and crypto tokens.' },
    { icon: '📌', title: 'Sticky Notes', tag: 'Family Board', description: 'Colored virtual post-it notes with handwriting typography.', configTips: 'Set author, message, and note paper color.' },
    { icon: '⏳', title: 'Countdown Timer', tag: 'Events', description: 'Live countdown timer to vacations, weddings, birthdays, or product launches.', configTips: 'Pick target date & time and give the event a title.' },
    { icon: '🍽️', title: 'Meal Planner', tag: 'Lifestyle', description: 'Weekly Monday-to-Sunday dinner and lunch meal schedule for the whole family.', configTips: 'Edit daily menu items directly in the inspector.' },
    { icon: '🛰️', title: 'Weather Radar', tag: 'Weather', description: 'Live animated Doppler rain and cloud radar map. Powered by RainViewer — 100% Free & Zero API Key Required.', configTips: 'Pick a quick city preset or enter Lat/Lon coordinates. No API key needed!' },
    { icon: '💬', title: 'Daily Quotes', tag: 'Inspiration', description: 'Daily motivational thoughts, stoic philosophy, or custom family mottos.', configTips: 'Select category or enter custom family quote.' },
    { icon: '🔤', title: 'Text & Announcements', tag: 'Core', description: 'Rich static text blocks for welcome messages, notices, and headings.', configTips: 'Set text, size, alignment, and optional gradient header.' },
    { icon: '🔳', title: 'QR Code', tag: 'Utility', description: 'Scannable QR codes for guest WiFi, URLs, menus, or contact cards.', configTips: 'Enter the URL or WiFi credentials to encode.' },
    { icon: '🌍', title: 'World Clocks', tag: 'Core', description: 'Side-by-side clocks for multiple cities and time zones.', configTips: 'Add cities with their IANA time zone (e.g. Europe/London).' },
    { icon: '🔷', title: 'Shapes & Dividers', tag: 'Decor', description: 'Rectangles, circles, and divider lines to structure your layout.', configTips: 'Pick shape, fill colour, border, and opacity.' },
    { icon: '🗓️', title: 'Scheduled Text', tag: 'Core', description: 'Announcements that automatically show and hide on chosen days and times.', configTips: 'Add messages with start/end time and active weekdays.' },
    { icon: '🔘', title: 'Button / Link', tag: 'Interactive', description: 'Touch buttons that jump to another page or open a URL.', configTips: 'Choose a label, icon, and target page or link.' },
    { icon: '🌅', title: 'Sun & Moon', tag: 'Weather', description: 'Sunrise, sunset, golden hour, and current moon phase for your location.', configTips: 'Enter a city name — coordinates are looked up automatically.' },
    { icon: '🕰️', title: 'Analog Clock', tag: 'Core', description: 'Classic dial clock with hour, minute, and optional second hands.', configTips: 'Choose dial style and whether to show the second hand.' },
    { icon: '🔌', title: 'External Data (REST)', tag: 'Data', description: 'Poll any JSON API and display a value with a label and unit.', configTips: 'Set the URL, optional auth header, and a JSONPath to the value.' },
    { icon: '🎯', title: 'Radial Gauge', tag: 'Data', description: 'Semicircular gauge with warning and critical thresholds; can receive pushed values.', configTips: 'Set min/max, thresholds, and unit, or push values via the webhook API.' },
    { icon: '🗺️', title: 'Google Maps', tag: 'Maps', description: 'Interactive or satellite map of any location with live traffic.', configTips: 'Search a location and adjust zoom level and map type.' },
    { icon: '✏️', title: 'Whiteboard', tag: 'Family Board', description: 'Touch and stylus drawing board with pen, highlighter, and eraser that syncs across devices.', configTips: 'Choose a background and default pen colour.' },
    { icon: '💼', title: 'Slack Channel', tag: 'Productivity', description: 'Latest messages from a Slack channel with avatars and timestamps.', configTips: 'Provide a Slack bot token and channel ID.' },
    { icon: '✉️', title: 'Gmail Unread', tag: 'Productivity', description: 'Unread email count with sender and subject previews.', configTips: 'Connect a Google account with Gmail read access.' },
    { icon: '📊', title: 'TradingView Chart', tag: 'Finance', description: 'Live candlestick, line, or area charts for stocks, crypto, and forex.', configTips: 'Enter a symbol (e.g. NASDAQ:AAPL), interval, and theme.' },
    { icon: '👽', title: 'Reddit Media', tag: 'Media', description: 'Photo slideshow from top posts of image subreddits like r/EarthPorn or r/space.', configTips: 'List subreddits and choose the time range (day, week, all).' }
  ];

  get filteredWidgets() {
    if (!this.widgetSearch.trim()) return this.widgetCatalog;
    const q = this.widgetSearch.toLowerCase();
    return this.widgetCatalog.filter(w => 
      w.title.toLowerCase().includes(q) || 
      w.tag.toLowerCase().includes(q) || 
      w.description.toLowerCase().includes(q)
    );
  }

  constructor(private router: Router) {}

  openPdfManual(): void {
    this.close();
    this.router.navigate(['/docs/installation']);
  }

  close(): void {
    this.closed.emit();
  }
}
