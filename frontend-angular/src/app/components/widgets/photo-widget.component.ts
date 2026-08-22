import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-container" [ngClass]="config.fitMode || 'cover'">
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
        <div class="caption-overlay" *ngIf="config.showCaptions && currentCaption">
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
    .photo-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      background-color: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .blur-backdrop {
      position: absolute;
      inset: -20px;
      background-size: cover;
      background-position: center;
      filter: blur(24px) brightness(0.6);
      z-index: 1;
    }
    .image-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 2;
    }
    .slide-image {
      width: 100%;
      height: 100%;
      display: block;
      transition: opacity 0.8s ease-in-out;
      border-radius: 12px;
    }
    .caption-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px 16px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.9rem;
      gap: 8px;
    }
    .photo-icon {
      width: 36px;
      height: 36px;
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
