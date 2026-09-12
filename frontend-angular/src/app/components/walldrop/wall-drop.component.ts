import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WalldropService } from '../../services/walldrop.service';
import { WallDropItem } from '../../models/display.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-wall-drop',
  template: `
    <div class="drop-container">
      <div class="drop-card">
        <div class="drop-header">
          <div class="beam-icon">📲</div>
          <h1>WallDrop Beam</h1>
          <p class="drop-sub">Beam a live note, photo, or scanned flyer onto <strong>{{ displayName || 'the wall screen' }}</strong></p>
        </div>

        <!-- Mode Switcher -->
        <div class="drop-tabs">
          <button [class.active]="mode === 'note'" (click)="mode = 'note'">📝 Sticky Note</button>
          <button [class.active]="mode === 'photo'" (click)="mode = 'photo'">🖼️ Photo</button>
          <button [class.active]="mode === 'flyer'" (click)="mode = 'flyer'">✨ AI Flyer Scan</button>
        </div>

        <!-- Feedback Messages -->
        <div *ngIf="successMessage" class="drop-alert success">
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="drop-alert error">
          {{ errorMessage }}
        </div>

        <!-- NOTE FORM -->
        <form *ngIf="mode === 'note'" (ngSubmit)="sendNote()" class="drop-form">
          <div class="form-group">
            <label>Your Note Message</label>
            <textarea 
              [(ngModel)]="noteContent" 
              name="noteContent" 
              placeholder="e.g. Pizza in the oven! 🍕 Don't forget soccer at 5 PM." 
              rows="3" 
              required 
              class="input-control text-area"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Your Name / Author</label>
            <input 
              type="text" 
              [(ngModel)]="author" 
              name="author" 
              placeholder="e.g. Mom, Lucas, Dad" 
              required 
              class="input-control" 
            />
          </div>

          <div class="form-group">
            <label>Sticky Note Color</label>
            <div class="color-palette">
              <button 
                type="button"
                *ngFor="let col of colors"
                [style.background]="col.hex"
                [class.selected]="selectedColor === col.hex"
                (click)="selectedColor = col.hex"
                class="color-btn"
                [title]="col.name"
              ></button>
            </div>
          </div>

          <button type="submit" [disabled]="beaming" class="btn btn-beam">
            {{ beaming ? 'Beaming...' : '⚡ Beam Note to Wall' }}
          </button>
        </form>

        <!-- PHOTO FORM -->
        <form *ngIf="mode === 'photo'" (ngSubmit)="sendPhoto()" class="drop-form">
          <div class="form-group">
            <label>Photo Image URL</label>
            <input 
              type="text" 
              [(ngModel)]="photoUrl" 
              name="photoUrl" 
              placeholder="https://... image link" 
              required 
              class="input-control" 
            />
          </div>

          <div class="form-group">
            <label>Caption</label>
            <input 
              type="text" 
              [(ngModel)]="photoCaption" 
              name="photoCaption" 
              placeholder="e.g. Beach weekend sunset 🌅" 
              class="input-control" 
            />
          </div>

          <div class="form-group">
            <label>Your Name</label>
            <input 
              type="text" 
              [(ngModel)]="author" 
              name="author" 
              placeholder="e.g. Emma" 
              required 
              class="input-control" 
            />
          </div>

          <button type="submit" [disabled]="beaming" class="btn btn-beam">
            {{ beaming ? 'Beaming...' : '🖼️ Beam Photo to Wall' }}
          </button>
        </form>

        <!-- AI MAGIC FLYER SCANNER FORM -->
        <div *ngIf="mode === 'flyer'" class="flyer-scanner-wrap">
          <div class="flyer-intro">
            <p>Snap a photo of a school schedule, sports flyer, or party invitation. Gemini AI will automatically extract the events and add them to the family calendar.</p>
          </div>

          <div class="upload-box" (click)="fileInput.click()">
            <input #fileInput type="file" accept="image/*" (change)="onFlyerFileSelected($event)" style="display:none" />
            <div *ngIf="!flyerPreviewBase64" class="upload-placeholder">
              <span class="upload-icon">📸</span>
              <span class="upload-text">Tap to snap or upload flyer photo</span>
            </div>
            <img *ngIf="flyerPreviewBase64" [src]="flyerPreviewBase64" alt="Flyer Preview" class="flyer-img-preview" />
          </div>

          <button 
            *ngIf="flyerPreviewBase64 && scannedEvents.length === 0" 
            type="button" 
            (click)="scanFlyer()" 
            [disabled]="scanning" 
            class="btn btn-beam scan-btn"
          >
            {{ scanning ? '✨ AI Analyzing Flyer...' : '✨ Extract Events with AI' }}
          </button>

          <!-- Scanned Events List -->
          <div *ngIf="scannedEvents.length > 0" class="scanned-events-list">
            <h4>Found {{ scannedEvents.length }} Events</h4>
            <div *ngFor="let ev of scannedEvents; let idx = index" class="scanned-event-card">
              <div class="event-card-header">
                <input type="text" [(ngModel)]="ev.title" class="ev-input-title" />
                <span class="ev-category-badge" [style.backgroundColor]="ev.color">{{ ev.category }}</span>
              </div>
              <div class="event-card-details">
                <div class="ev-detail-row">
                  <span class="ev-label">Date/Time:</span>
                  <input type="text" [(ngModel)]="ev.startDate" class="ev-input-small" />
                </div>
                <div class="ev-detail-row" *ngIf="ev.location">
                  <span class="ev-label">Location:</span>
                  <input type="text" [(ngModel)]="ev.location" class="ev-input-small" />
                </div>
              </div>
            </div>

            <button 
              type="button" 
              (click)="saveScannedEventsToCalendar()" 
              [disabled]="savingToCal" 
              class="btn btn-beam save-cal-btn"
            >
              {{ savingToCal ? 'Adding to Calendar...' : '📅 Add All Events to Calendar' }}
            </button>
          </div>
        </div>

        <!-- Recent Drops History -->
        <div *ngIf="recentDrops.length > 0" class="recent-drops-sec">
          <h4>Recent WallDrops</h4>
          <div class="recent-list">
            <div *ngFor="let drop of recentDrops" class="drop-item-preview" [style.border-left-color]="drop.color || '#38bdf8'">
              <span class="drop-item-author">{{ drop.author }}</span>
              <span class="drop-item-content">{{ drop.content }}</span>
              <span class="drop-item-time">{{ drop.created_at | date:'shortTime' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drop-container {
      min-height: 100vh;
      background: radial-gradient(circle at top, #0f172a 0%, #06090e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      font-family: var(--font-main, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #f1f5f9;
    }
    .drop-card {
      width: 100%;
      max-width: 440px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 28px 24px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      box-sizing: border-box;
    }
    .drop-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .beam-icon { font-size: 2.5rem; margin-bottom: 8px; }
    h1 {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .drop-sub {
      font-size: 0.82rem;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.4;
    }
    .drop-sub strong { color: #38bdf8; }

    .drop-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 3px;
      margin-bottom: 18px;
    }
    .drop-tabs button {
      flex: 1;
      background: none;
      border: none;
      color: #94a3b8;
      padding: 9px;
      font-size: 0.82rem;
      font-weight: 700;
      border-radius: 9px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .drop-tabs button.active {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
    }

    .drop-alert {
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 16px;
      text-align: center;
    }
    .drop-alert.success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }
    .drop-alert.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    .drop-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .input-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .input-control:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
    .text-area { resize: vertical; }

    .color-palette {
      display: flex;
      gap: 10px;
    }
    .color-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
    }
    .color-btn.selected {
      border-color: #ffffff;
      transform: scale(1.2);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .btn-beam {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
      padding: 13px;
      border-radius: 10px;
      border: none;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
      transition: all 0.2s;
    }
    .btn-beam:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    /* AI Flyer Scanner Styles */
    .flyer-scanner-wrap {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .flyer-intro p {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.4;
    }
    .upload-box {
      background: rgba(0, 0, 0, 0.4);
      border: 2px dashed rgba(56, 189, 248, 0.4);
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-box:hover {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.05);
    }
    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .upload-icon { font-size: 2rem; }
    .upload-text { font-size: 0.85rem; color: #38bdf8; font-weight: 600; }
    .flyer-img-preview {
      max-height: 160px;
      max-width: 100%;
      border-radius: 8px;
      object-fit: contain;
    }
    .scan-btn {
      background: linear-gradient(135deg, #a855f7, #6366f1);
      box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);
    }
    .scanned-events-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .scanned-events-list h4 {
      font-size: 0.82rem;
      font-weight: 700;
      color: #38bdf8;
      margin: 0;
    }
    .scanned-event-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .event-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .ev-input-title {
      flex: 1;
      background: none;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 2px 0;
    }
    .ev-category-badge {
      font-size: 0.6rem;
      font-weight: 800;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .event-card-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ev-detail-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ev-label {
      font-size: 0.68rem;
      color: #94a3b8;
      width: 60px;
      flex-shrink: 0;
    }
    .ev-input-small {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.75rem;
      padding: 2px 6px;
    }
    .save-cal-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }

    .recent-drops-sec {
      margin-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
    }
    .recent-drops-sec h4 {
      font-size: 0.78rem;
      font-weight: 700;
      color: #94a3b8;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 140px;
      overflow-y: auto;
    }
    .drop-item-preview {
      background: rgba(0, 0, 0, 0.25);
      border-left: 3px solid #38bdf8;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
    }
    .drop-item-author {
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
    }
    .drop-item-content {
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .drop-item-time {
      font-size: 0.65rem;
      color: #64748b;
      align-self: flex-end;
    }
  `]
})
export class WallDropComponent implements OnInit {
  token: string = '';
  displayName: string = '';
  mode: 'note' | 'photo' | 'flyer' = 'note';

  author: string = 'Mom';
  noteContent: string = '';
  selectedColor: string = '#fef08a';

  photoUrl: string = '';
  photoCaption: string = '';

  // AI Flyer Scanner State
  flyerPreviewBase64: string = '';
  scanning: boolean = false;
  savingToCal: boolean = false;
  scannedEvents: any[] = [];

  beaming: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  colors = [
    { name: 'Warm Yellow', hex: '#fef08a' },
    { name: 'Rose Pink', hex: '#fbcfe8' },
    { name: 'Mint Green', hex: '#bbf7d0' },
    { name: 'Sky Blue', hex: '#bae6fd' },
    { name: 'Lavender', hex: '#e9d5ff' }
  ];

  recentDrops: WallDropItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private walldropService: WalldropService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (this.token) {
      this.loadDrops();
    }
  }

  loadDrops(): void {
    this.walldropService.getDrops(this.token).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.displayName = res.display?.name || '';
          this.recentDrops = res.items || [];
        }
      }
    });
  }

  onFlyerFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.flyerPreviewBase64 = e.target.result;
        this.scannedEvents = [];
        this.errorMessage = '';
      };
      reader.readAsDataURL(file);
    }
  }

  scanFlyer(): void {
    if (!this.flyerPreviewBase64) return;
    this.scanning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<any>(`${environment.apiUrl}/ai_flyer_scanner.php`, {
      imageBase64: this.flyerPreviewBase64,
      displayToken: this.token
    }).subscribe({
      next: (res: any) => {
        this.scanning = false;
        if (res && res.success && Array.isArray(res.events)) {
          this.scannedEvents = res.events;
          this.successMessage = `✨ Extracted ${res.events.length} events from flyer! Review and add to calendar below.`;
        } else {
          this.errorMessage = 'Could not extract events from flyer.';
        }
      },
      error: () => {
        this.scanning = false;
        this.errorMessage = 'Failed to analyze flyer. Please check image and connection.';
      }
    });
  }

  saveScannedEventsToCalendar(): void {
    if (this.scannedEvents.length === 0) return;
    this.savingToCal = true;
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/ai_flyer_scanner.php`, {
      imageBase64: this.flyerPreviewBase64,
      displayToken: this.token,
      autoSaveToCalendar: true
    }).subscribe({
      next: () => {
        this.savingToCal = false;
        this.successMessage = `📅 Successfully added ${this.scannedEvents.length} events to wall display calendar!`;
        this.scannedEvents = [];
        this.flyerPreviewBase64 = '';
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: () => {
        this.savingToCal = false;
        this.errorMessage = 'Failed to save events to calendar.';
      }
    });
  }

  sendNote(): void {
    if (!this.noteContent.trim()) {
      this.errorMessage = 'Please type a note message.';
      return;
    }

    this.beaming = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.walldropService.beamDrop(this.token, {
      type: 'note',
      author: this.author,
      content: this.noteContent,
      color: this.selectedColor
    }).subscribe({
      next: () => {
        this.beaming = false;
        this.successMessage = '🎉 Beamed to wall screen instantly!';
        this.noteContent = '';
        this.loadDrops();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.beaming = false;
        this.errorMessage = err.error?.error || 'Failed to beam note. Please check connection.';
      }
    });
  }

  sendPhoto(): void {
    if (!this.photoUrl.trim()) {
      this.errorMessage = 'Please enter a photo image URL.';
      return;
    }

    this.beaming = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.walldropService.beamDrop(this.token, {
      type: 'photo',
      author: this.author,
      content: this.photoCaption || 'Family Photo',
      media_url: this.photoUrl
    }).subscribe({
      next: () => {
        this.beaming = false;
        this.successMessage = '🖼️ Photo beamed to wall screen!';
        this.photoUrl = '';
        this.photoCaption = '';
        this.loadDrops();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.beaming = false;
        this.errorMessage = err.error?.error || 'Failed to beam photo.';
      }
    });
  }
}
