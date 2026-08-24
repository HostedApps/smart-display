import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-card" [ngClass]="config.fitMode || 'cover'">
      <div 
        *ngIf="config.blurBackground && config.fitMode === 'contain' && currentImageUrl" 
        class="blur-backdrop" 
        [style.backgroundImage]="'url(' + currentImageUrl + ')'"
      ></div>
      
      <div class="image-wrapper" *ngIf="images.length > 0; else noImages">
        <img 
          [src]="currentImageUrl" 
          [alt]="'Slide ' + (currentIndex + 1)" 
          class="slide-image"
          [style.object-fit]="config.fitMode || 'cover'"
          (error)="handleImageError()"
        />
        <div class="caption-pill" *ngIf="config.showCaptions && currentCaption">
          <span>{{ currentCaption }}</span>
        </div>
      </div>

      <ng-template #noImages>
        <div class="empty-state">
          <svg class="photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p>No photos configured</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .photo-card {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background-color: rgba(0, 0, 0, 0.6);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .blur-backdrop {
      position: absolute;
      inset: -20px;
      background-size: cover;
      background-position: center;
      filter: blur(28px) brightness(0.5);
      z-index: 1;
    }
    .image-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 2;
      overflow: hidden;
    }
    .slide-image {
      width: 100%;
      height: 100%;
      display: block;
      transition: transform 8s ease, opacity 0.8s ease-in-out;
      transform: scale(1.03);
    }
    .slide-image:hover {
      transform: scale(1.08);
    }
    .caption-pill {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 4px 12px;
      border-radius: 20px;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.2px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.85rem;
      gap: 8px;
    }
    .photo-icon {
      width: 32px;
      height: 32px;
      color: var(--accent-blue, #0ea5e9);
    }
  `]
})
export class PhotoWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    images: [],
    intervalSeconds: 10,
    fitMode: 'cover',
    blurBackground: true,
    showCaptions: false
  };

  private defaultImages: string[] = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1280&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1280&q=80'
  ];

  currentIndex: number = 0;
  private timerSub?: Subscription;

  get images(): string[] {
    if (this.config.images && Array.isArray(this.config.images) && this.config.images.length > 0) {
      return this.config.images;
    }
    if (typeof this.config.images === 'string' && this.config.images.trim()) {
      return this.config.images.split('\n').map((u: string) => u.trim()).filter((u: string) => !!u);
    }
    return this.defaultImages;
  }

  get currentImageUrl(): string {
    const list = this.images;
    return list[this.currentIndex % list.length] || '';
  }

  get currentCaption(): string {
    if (!this.config.captions || !Array.isArray(this.config.captions)) return '';
    return this.config.captions[this.currentIndex % this.config.captions.length] || '';
  }

  ngOnInit(): void {
    this.restartTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.restartTimer();
    }
  }

  private restartTimer(): void {
    this.timerSub?.unsubscribe();
    const intervalSec = Math.max(3, Number(this.config.intervalSeconds) || 10);
    this.timerSub = interval(intervalSec * 1000).subscribe(() => {
      if (this.images.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
      }
    });
  }

  handleImageError(): void {
    if (this.images.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }
}
