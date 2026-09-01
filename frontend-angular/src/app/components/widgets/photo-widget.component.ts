import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-card" [ngClass]="config.fitMode || 'cover'">
      <div 
        *ngIf="config.blurBackground && config.fitMode === 'contain' && currentImageUrl" 
        class="blur-backdrop" 
        [style.backgroundImage]="'url(' + currentImageUrl + ')'"
      ></div>
      
      <div class="image-wrapper" *ngIf="effectiveImages.length > 0; else noImages">
        <img 
          [src]="currentImageUrl" 
          [alt]="'Slide ' + (currentIndex + 1)" 
          class="slide-image"
          [class.ken-burns]="config.kenBurns !== false"
          [style.object-fit]="config.fitMode || 'cover'"
          (error)="handleImageError()"
        />
        
        <div class="album-badge" *ngIf="isGooglePhotos">
          <span>📷 Google Photos ({{ effectiveImages.length }})</span>
        </div>

        <div class="caption-pill" *ngIf="config.showCaptions && currentCaption">
          <span>{{ currentCaption }}</span>
        </div>
      </div>

      <ng-template #noImages>
        <div class="empty-state">
          <div *ngIf="loadingAlbum" class="loading-wrap">
            <div class="spinner-mini"></div>
            <p>Loading Google Photos Album...</p>
          </div>
          <div *ngIf="!loadingAlbum">
            <svg class="photo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p>No photos configured</p>
          </div>
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
    .slide-image.ken-burns {
      animation: kenBurnsPan 16s ease-in-out infinite alternate;
    }
    @keyframes kenBurnsPan {
      0% { transform: scale(1.0) translate(0%, 0%); }
      50% { transform: scale(1.08) translate(-1.5%, -1%); }
      100% { transform: scale(1.04) translate(1%, -1.5%); }
    }
    .slide-image:hover {
      transform: scale(1.08);
    }
    .album-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 3px 8px;
      border-radius: 12px;
      color: #38bdf8;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
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
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #38bdf8;
    }
    .spinner-mini {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PhotoWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    albumUrl: '',
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

  googlePhotosList: string[] = [];
  loadingAlbum: boolean = false;
  isGooglePhotos: boolean = false;
  currentIndex: number = 0;
  private timerSub?: Subscription;
  private albumPollSub?: Subscription;

  constructor(private http: HttpClient) {}

  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_\-]+)/i);
    if (driveMatch) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return trimmed;
  }

  get effectiveImages(): string[] {
    let list: string[] = [];
    if (this.googlePhotosList.length > 0) {
      list = this.googlePhotosList;
    } else if (this.config.images && Array.isArray(this.config.images) && this.config.images.length > 0) {
      list = this.config.images;
    } else if (typeof this.config.images === 'string' && this.config.images.trim()) {
      const urls = this.config.images.split('\n').map((u: string) => u.trim()).filter((u: string) => !!u);
      if (urls.length > 0) list = urls;
    } else {
      list = this.defaultImages;
    }
    return list.map(u => this.normalizeImageUrl(u));
  }

  get currentImageUrl(): string {
    const list = this.effectiveImages;
    return list[this.currentIndex % list.length] || '';
  }

  get currentCaption(): string {
    if (!this.config.captions || !Array.isArray(this.config.captions)) return '';
    return this.config.captions[this.currentIndex % this.config.captions.length] || '';
  }

  ngOnInit(): void {
    this.checkAndFetchGooglePhotos();
    this.restartTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.checkAndFetchGooglePhotos();
      this.restartTimer();
    }
  }

  private checkAndFetchGooglePhotos(): void {
    const albumUrl = this.config.albumUrl || (typeof this.config.images === 'string' && (this.config.images.includes('photos.') || this.config.images.includes('drive.google.com') || this.config.images.includes('goo.gl')) ? this.config.images.trim() : '');
    
    if (albumUrl && (albumUrl.includes('photos.app.goo.gl') || albumUrl.includes('photos.google.com') || albumUrl.includes('drive.google.com') || albumUrl.includes('goo.gl'))) {
      this.isGooglePhotos = true;
      this.fetchGooglePhotosAlbum(albumUrl);

      // Refresh Google Photos album every 30 minutes for newly added family photos
      this.albumPollSub?.unsubscribe();
      this.albumPollSub = interval(30 * 60 * 1000).subscribe(() => this.fetchGooglePhotosAlbum(albumUrl));
    } else {
      this.isGooglePhotos = false;
      this.googlePhotosList = [];
    }
  }

  private fetchGooglePhotosAlbum(url: string): void {
    this.loadingAlbum = true;
    const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_google_photos&album_url=${encodeURIComponent(url)}`;
    
    this.http.get<any>(proxyUrl)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.loadingAlbum = false;
        if (res && res.success && Array.isArray(res.images) && res.images.length > 0) {
          this.googlePhotosList = res.images;
          this.currentIndex = 0;
        }
      });
  }

  private restartTimer(): void {
    this.timerSub?.unsubscribe();
    const intervalSec = Math.max(3, Number(this.config.intervalSeconds) || 10);
    this.timerSub = interval(intervalSec * 1000).subscribe(() => {
      if (this.effectiveImages.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.effectiveImages.length;
      }
    });
  }

  handleImageError(): void {
    if (this.effectiveImages.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.effectiveImages.length;
    }
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.albumPollSub?.unsubscribe();
  }
}
