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
  // Global Static In-Memory Cache for Album URLs & Current Playback Indices across page rotations & re-renders
  private static albumCache = new Map<string, string[]>();
  private static albumIndexMap = new Map<string, number>();

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
  private currentLoadedAlbumUrl: string = '';
  private currentIntervalSec: number = 0;
  private timerSub?: Subscription;
  private albumPollSub?: Subscription;
  private retryTimeout?: any;
  private onlineListener?: () => void;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;

  constructor(private http: HttpClient) {}

  private static getStorageKey(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash |= 0;
    }
    return `gphotos_album_${Math.abs(hash)}`;
  }

  private static loadAlbumFromStorage(url: string): string[] | null {
    try {
      const raw = localStorage.getItem(PhotoWidgetComponent.getStorageKey(url));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  private static saveAlbumToStorage(url: string, images: string[]): void {
    try {
      localStorage.setItem(PhotoWidgetComponent.getStorageKey(url), JSON.stringify(images));
    } catch (e) {}
  }

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
    if (this.isGooglePhotos) {
      // Return cached/fetched Google Photos list (never flash default images while album is active)
      return this.googlePhotosList.map(u => this.normalizeImageUrl(u));
    }
    if (this.config.images && Array.isArray(this.config.images) && this.config.images.length > 0) {
      return this.config.images.map((u: string) => this.normalizeImageUrl(u));
    }
    if (typeof this.config.images === 'string' && this.config.images.trim()) {
      const urls = this.config.images.split('\n').map((u: string) => u.trim()).filter((u: string) => !!u);
      if (urls.length > 0) return urls.map((u: string) => this.normalizeImageUrl(u));
    }
    return this.defaultImages;
  }

  get currentImageUrl(): string {
    const list = this.effectiveImages;
    if (list.length === 0) return '';
    return list[this.currentIndex % list.length] || '';
  }

  get currentCaption(): string {
    if (!this.config.captions || !Array.isArray(this.config.captions)) return '';
    return this.config.captions[this.currentIndex % this.config.captions.length] || '';
  }

  ngOnInit(): void {
    // Listen for network reconnect to immediately retry album download
    this.onlineListener = () => {
      const albumUrl = this.getAlbumUrl();
      if (albumUrl && this.isGooglePhotos) {
        this.fetchGooglePhotosAlbum(albumUrl, false, 0);
      }
    };
    window.addEventListener('online', this.onlineListener);

    this.checkAndFetchGooglePhotos();
    this.restartTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.checkAndFetchGooglePhotos();
      this.restartTimer();
    }
  }

  private getAlbumUrl(): string {
    return this.config.albumUrl || (typeof this.config.images === 'string' && (this.config.images.includes('photos.') || this.config.images.includes('drive.google.com') || this.config.images.includes('goo.gl')) ? this.config.images.trim() : '');
  }

  private checkAndFetchGooglePhotos(): void {
    const albumUrl = this.getAlbumUrl();
    
    if (albumUrl && (albumUrl.includes('photos.app.goo.gl') || albumUrl.includes('photos.google.com') || albumUrl.includes('drive.google.com') || albumUrl.includes('goo.gl'))) {
      this.isGooglePhotos = true;

      // Restore saved progression index for this album
      if (PhotoWidgetComponent.albumIndexMap.has(albumUrl)) {
        this.currentIndex = PhotoWidgetComponent.albumIndexMap.get(albumUrl) || 0;
      }

      // Step 1: Check In-Memory Cache
      if (PhotoWidgetComponent.albumCache.has(albumUrl)) {
        this.googlePhotosList = PhotoWidgetComponent.albumCache.get(albumUrl)!;
        this.currentLoadedAlbumUrl = albumUrl;
      } else {
        // Step 2: Check Persistent LocalStorage Cache (Instant 0ms boot loading)
        const stored = PhotoWidgetComponent.loadAlbumFromStorage(albumUrl);
        if (stored && stored.length > 0) {
          PhotoWidgetComponent.albumCache.set(albumUrl, stored);
          this.googlePhotosList = stored;
          this.currentLoadedAlbumUrl = albumUrl;
        }
      }

      // If already loaded in memory and we have photos, perform background sync instead of blocking spinner
      const hasLocalPhotos = this.googlePhotosList.length > 0;
      this.fetchGooglePhotosAlbum(albumUrl, hasLocalPhotos, 0);

      // Refresh Google Photos album every 30 minutes for newly added family photos
      this.albumPollSub?.unsubscribe();
      this.albumPollSub = interval(30 * 60 * 1000).subscribe(() => this.fetchGooglePhotosAlbum(albumUrl, true, 0));
    } else {
      this.isGooglePhotos = false;
      this.currentLoadedAlbumUrl = '';
      this.googlePhotosList = [];
    }
  }

  private fetchGooglePhotosAlbum(url: string, isBackgroundRefresh: boolean = false, retryAttempt: number = 0): void {
    if (!isBackgroundRefresh && this.googlePhotosList.length === 0) {
      this.loadingAlbum = true;
    }
    const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_google_photos&album_url=${encodeURIComponent(url)}`;
    
    this.http.get<any>(proxyUrl)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.loadingAlbum = false;
        if (res && res.success && Array.isArray(res.images) && res.images.length > 0) {
          PhotoWidgetComponent.albumCache.set(url, res.images);
          PhotoWidgetComponent.saveAlbumToStorage(url, res.images);
          this.googlePhotosList = res.images;
          this.currentLoadedAlbumUrl = url;
          
          // Preserve playback index seamlessly within bounds
          if (this.currentIndex >= this.googlePhotosList.length) {
            this.currentIndex = this.currentIndex % this.googlePhotosList.length;
          }
          PhotoWidgetComponent.albumIndexMap.set(url, this.currentIndex);
          this.preloadNextImage();
        } else {
          // If fetch failed (e.g. Pi booted before Wi-Fi connected), retry with exponential backoff
          if (retryAttempt < 5) {
            const delay = Math.min(30000, 3000 * Math.pow(2, retryAttempt));
            if (this.retryTimeout) clearTimeout(this.retryTimeout);
            this.retryTimeout = setTimeout(() => {
              this.fetchGooglePhotosAlbum(url, this.googlePhotosList.length > 0, retryAttempt + 1);
            }, delay);
          }
        }
      });
  }

  private saveCurrentIndex(): void {
    const albumUrl = this.getAlbumUrl();
    if (albumUrl) {
      PhotoWidgetComponent.albumIndexMap.set(albumUrl, this.currentIndex);
    }
    this.preloadNextImage();
  }

  private preloadNextImage(): void {
    const list = this.effectiveImages;
    if (list.length > 1) {
      const nextIdx = (this.currentIndex + 1) % list.length;
      const nextUrl = list[nextIdx];
      if (nextUrl) {
        const img = new Image();
        img.src = nextUrl;
      }
    }
  }

  private restartTimer(): void {
    const intervalSec = Math.max(3, Number(this.config.intervalSeconds) || 10);
    if (this.timerSub && this.currentIntervalSec === intervalSec) {
      return;
    }

    this.timerSub?.unsubscribe();
    this.currentIntervalSec = intervalSec;
    this.timerSub = interval(intervalSec * 1000).subscribe(() => {
      if (this.effectiveImages.length > 1) {
        this.currentIndex = (this.currentIndex + 1) % this.effectiveImages.length;
        this.saveCurrentIndex();
      }
    });
  }

  handleImageError(): void {
    const now = Date.now();
    if (now - this.lastErrorTime < 500) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    if (this.errorCount > 5) {
      // Prevent infinite rotation spinning if offline
      return;
    }

    if (this.effectiveImages.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.effectiveImages.length;
      this.saveCurrentIndex();
    }
  }

  ngOnDestroy(): void {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.timerSub?.unsubscribe();
    this.albumPollSub?.unsubscribe();
  }
}
