import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RedditConfig, RedditPost } from '../../models/display.model';

@Component({
  selector: 'app-reddit-widget',
  template: `
    <div class="reddit-card">
      <!-- Background / Active Image -->
      <div
        class="reddit-image-bg"
        *ngIf="currentPost"
        [style.backgroundImage]="'url(' + currentPost.url + ')'"
      ></div>

      <!-- Gradient Overlay for readability -->
      <div class="reddit-overlay"></div>

      <!-- Top Header Bar -->
      <div class="reddit-header">
        <div class="sub-badge">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="#ff4500" class="reddit-icon">
            <circle cx="10" cy="10" r="10"/>
            <path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 6.87 6.87 0 0 0-3.84-1.2l.65-3.07 2.13.45a1 1 0 1 0 .2-0.56l-2.4-.5a.26.26 0 0 0-.3.2l-.76 3.58a6.83 6.83 0 0 0-3.89 1.2 1.46 1.46 0 1 0-1.89 2.37 3 3 0 0 0 0 .55c0 2.8 3.27 5.07 7.3 5.07s7.3-2.27 7.3-5.07a3 3 0 0 0 0-.55 1.46 1.46 0 0 0 .22-.01 1.45 1.45 0 0 0-2.25-1.5zM7.34 10.74a1.09 1.09 0 1 1 1.09 1.09 1.09 1.09 0 0 1-1.09-1.09zm5.55 3.12a3.86 3.86 0 0 1-2.89.84 3.86 3.86 0 0 1-2.89-.84.22.22 0 0 1 .31-.31 3.42 3.42 0 0 0 2.58.74 3.42 3.42 0 0 0 2.58-.74.22.22 0 1 1 .31.31zm-.23-2a1.09 1.09 0 1 1 1.09-1.09 1.09 1.09 0 0 1-1.09 1.09z"/>
          </svg>
          <span class="sub-name">r/{{ config.subreddit || 'EarthPorn' }}</span>
        </div>
        <div class="reddit-meta-chips" *ngIf="currentPost && config.showScore !== false">
          <span class="chip score-chip">▲ {{ formatScore(currentPost.score) }}</span>
          <span class="chip index-chip">{{ currentIndex + 1 }}/{{ posts.length }}</span>
        </div>
      </div>

      <!-- Navigation Arrows (appear on hover/touch) -->
      <div class="nav-btn prev-btn" (click)="prevPost($event)" title="Previous photo">‹</div>
      <div class="nav-btn next-btn" (click)="nextPost($event)" title="Next photo">›</div>

      <!-- Bottom Post Info Card -->
      <div class="reddit-footer" *ngIf="currentPost && config.showTitle !== false">
        <p class="post-title" [title]="currentPost.title">{{ currentPost.title }}</p>
        <div class="post-author-row">
          <span class="author-label">by u/{{ currentPost.author }}</span>
        </div>
      </div>

      <!-- Loading / Empty State -->
      <div class="loading-state" *ngIf="isLoading && posts.length === 0">
        <div class="spinner"></div>
        <span>Loading r/{{ config.subreddit || 'EarthPorn' }}...</span>
      </div>
    </div>
  `,
  styles: [`
    .reddit-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      background: #0f172a;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .reddit-image-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-size: cover;
      background-position: center;
      transition: background-image 0.8s ease-in-out;
      transform: scale(1.02);
    }

    .reddit-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.6) 0%,
        rgba(0, 0, 0, 0) 30%,
        rgba(0, 0, 0, 0.1) 60%,
        rgba(0, 0, 0, 0.85) 100%
      );
      pointer-events: none;
    }

    .reddit-header {
      position: relative;
      z-index: 2;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sub-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .sub-name {
      font-size: 0.75rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 0.4px;
    }

    .reddit-meta-chips {
      display: flex;
      gap: 6px;
    }

    .chip {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
    }

    .score-chip {
      color: #ff8b60;
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 3;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.4);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      cursor: pointer;
      user-select: none;
      backdrop-filter: blur(6px);
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }

    .reddit-card:hover .nav-btn {
      opacity: 0.85;
    }

    .nav-btn:hover {
      background: rgba(255, 69, 0, 0.8);
      opacity: 1;
    }

    .prev-btn { left: 10px; }
    .next-btn { right: 10px; }

    .reddit-footer {
      position: relative;
      z-index: 2;
      padding: 12px 16px;
    }

    .post-title {
      margin: 0 0 4px 0;
      font-size: 0.88rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }

    .post-author-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .author-label {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .loading-state {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #94a3b8;
      font-size: 0.82rem;
      z-index: 4;
      background: rgba(15, 23, 42, 0.85);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 69, 0, 0.3);
      border-top-color: #ff4500;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class RedditWidgetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() config: RedditConfig = {
    subreddit: 'EarthPorn',
    sort: 'hot',
    intervalSeconds: 30,
    showScore: true,
    showTitle: true
  };

  posts: RedditPost[] = [];
  currentIndex = 0;
  isLoading = false;
  private intervalTimer: any = null;

  constructor(private http: HttpClient) {}

  get currentPost(): RedditPost | null {
    if (!this.posts.length) return null;
    return this.posts[this.currentIndex] || null;
  }

  ngOnInit(): void {
    this.fetchRedditFeed();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && !changes['config'].firstChange) {
      this.fetchRedditFeed();
    }
  }

  ngOnDestroy(): void {
    this.stopSlideTimer();
  }

  fetchRedditFeed(): void {
    this.isLoading = true;
    const sub = this.config.subreddit || 'EarthPorn';
    const sort = this.config.sort || 'hot';
    const url = `${environment.apiUrl}/proxy.php?action=fetch_reddit_feed&subreddit=${encodeURIComponent(sub)}&sort=${sort}&limit=30`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && Array.isArray(res.posts) && res.posts.length > 0) {
          this.posts = res.posts;
          this.currentIndex = 0;
          this.startSlideTimer();
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private startSlideTimer(): void {
    this.stopSlideTimer();
    const sec = Math.max(10, this.config.intervalSeconds || 30);
    this.intervalTimer = setInterval(() => {
      this.nextPost();
    }, sec * 1000);
  }

  private stopSlideTimer(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  nextPost(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.posts.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.posts.length;
  }

  prevPost(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.posts.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.posts.length) % this.posts.length;
  }

  formatScore(score: number): string {
    if (score >= 1000) {
      return (score / 1000).toFixed(1) + 'k';
    }
    return score.toString();
  }
}
