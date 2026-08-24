import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WalldropService } from '../../services/walldrop.service';
import { WallDropItem } from '../../models/display.model';

@Component({
  selector: 'app-wall-drop',
  template: `
    <div class="drop-container">
      <div class="drop-card">
        <div class="drop-header">
          <div class="beam-icon">📲</div>
          <h1>WallDrop Beam</h1>
          <p class="drop-sub">Beam a live note or photo directly onto <strong>{{ displayName || 'the wall screen' }}</strong></p>
        </div>

        <!-- Mode Switcher -->
        <div class="drop-tabs">
          <button [class.active]="mode === 'note'" (click)="mode = 'note'">📝 Post a Sticky Note</button>
          <button [class.active]="mode === 'photo'" (click)="mode = 'photo'">🖼️ Beam a Photo</button>
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
  mode: 'note' | 'photo' = 'note';

  author: string = 'Mom';
  noteContent: string = '';
  selectedColor: string = '#fef08a';

  photoUrl: string = '';
  photoCaption: string = '';

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
    private walldropService: WalldropService
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
