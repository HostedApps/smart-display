import { Component, Input, OnInit, OnDestroy, DoCheck, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { AIBriefingConfig } from '../../models/display.model';
import { environment } from '../../../environments/environment';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-ai-briefing-widget',
  template: `
    <div class="ai-card">
      <div class="ai-header">
        <div class="ai-orb-wrap">
          <div class="ai-orb"></div>
          <div class="ai-glow"></div>
        </div>
        <div class="ai-title-group">
          <span class="ai-badge">DAILY INTELLIGENCE</span>
          <span class="ai-time-label">{{ greeting }}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button (click)="fetchBriefing()" class="btn-action" title="Regenerate Briefing">
            🔄
          </button>
          <button (click)="toggleSpeak()" class="btn-action" [class.speaking]="isSpeaking" title="Read Aloud">
            {{ isSpeaking ? '🔊' : '🔈' }}
          </button>
        </div>
      </div>

      <app-widget-state *ngIf="briefingFailed && !loading; else briefingBody" kind="error" message="Briefing unavailable" hint="Couldn't generate today's briefing. Retrying automatically."></app-widget-state>

      <ng-template #briefingBody>
      <div class="ai-content">
        <p class="briefing-text" [class.loading-shimmer]="loading">
          {{ displayedText || 'Synthesizing daily schedule, weather outlook, and reminders...' }}
        </p>
      </div>

      </ng-template>

      <div class="ai-footer" *ngIf="!(briefingFailed && !loading)">
        <span class="provider-pill" [class.is-gemini]="provider === 'gemini'" [class.has-error]="!!geminiError" [title]="geminiError || (provider === 'gemini' ? 'Synthesized via Google Gemini 1.5 Flash' : 'Using contextual rule-based ambient engine')">
          <ng-container *ngIf="provider === 'gemini'">✨ Powered by Google Gemini</ng-container>
          <ng-container *ngIf="provider !== 'gemini' && geminiError">⚠️ Gemini Error (Fallback Active)</ng-container>
          <ng-container *ngIf="provider !== 'gemini' && !geminiError">⚡ Ambient Offline Engine</ng-container>
        </span>
        <span class="synced-time">{{ lastSync }}</span>
      </div>
    </div>
  `,
  styles: [`
    .ai-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(16px);
      color: #f1f5f9;
      font-family: var(--font-main, sans-serif);
      overflow: hidden;
      position: relative;
    }
    .ai-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-orb-wrap {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ai-orb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #a855f7, #ec4899);
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.8);
      animation: rotate-orb 3s linear infinite;
    }
    .ai-glow {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent 70%);
      animation: pulse-glow 2s ease-in-out infinite;
    }
    @keyframes rotate-orb {
      0% { transform: rotate(0deg) scale(0.95); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(0.95); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    .ai-title-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .ai-badge {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #c084fc;
    }
    .ai-time-label {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
    }
    .btn-action {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 0.85rem;
      cursor: pointer;
      color: #94a3b8;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-action:hover, .btn-action.speaking {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      color: #fff;
    }

    .ai-content {
      margin: 10px 0;
      flex: 1;
      display: flex;
      align-items: flex-start;
      overflow-y: auto;
      max-height: 100%;
    }
    .briefing-text {
      font-family: var(--font-editorial, 'Newsreader', serif);
      font-size: 1.12rem;
      font-style: italic;
      line-height: 1.5;
      color: #e2e8f0;
      margin: 0;
    }
    .loading-shimmer {
      opacity: 0.6;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

    .ai-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.68rem;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
    }
    .provider-pill {
      color: #94a3b8;
      font-weight: 600;
      transition: all 0.2s;
    }
    .provider-pill.is-gemini {
      color: #38bdf8;
      text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }
    .provider-pill.has-error {
      color: #fbbf24;
      cursor: help;
    }
  `]
})
export class AIBriefingWidgetComponent implements OnInit, OnDestroy, DoCheck {
  @Input() config: AIBriefingConfig = {};

  greeting: string = 'Daily Executive Briefing';
  displayedText: string = '';
  loading: boolean = true;
  isSpeaking: boolean = false;
  provider: string = 'ambient_engine';
  geminiError: string = '';
  lastSync: string = 'Updated just now';
  /** Live displays only: set when the briefing could not be generated (no canned text is shown). */
  briefingFailed: boolean = false;
  readonly isLive: boolean;
  private pollSub?: Subscription;

  private lastApiKey: string = '';
  private lastUserName: string = '';
  private lastTone: string = '';

  constructor(private http: HttpClient, @Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    this.lastApiKey = this.config?.apiKey || '';
    this.lastUserName = this.config?.userName || '';
    this.lastTone = this.config?.tone || '';

    this.updateGreeting();
    this.fetchBriefing();

    const hours = this.config.refreshHours || 1;
    this.pollSub = interval(hours * 3600 * 1000).subscribe(() => {
      this.updateGreeting();
      this.fetchBriefing();
    });
  }

  ngDoCheck(): void {
    const key = this.config?.apiKey || '';
    const user = this.config?.userName || '';
    const tone = this.config?.tone || '';

    if (key !== this.lastApiKey || user !== this.lastUserName || tone !== this.lastTone) {
      this.lastApiKey = key;
      this.lastUserName = user;
      this.lastTone = tone;
      this.fetchBriefing();
    }
  }

  updateGreeting(): void {
    const hr = new Date().getHours();
    if (hr < 12) this.greeting = 'Good Morning Briefing';
    else if (hr < 17) this.greeting = 'Afternoon Status Briefing';
    else this.greeting = 'Evening Reflection & Outlook';
  }

  fetchBriefing(): void {
    this.loading = true;
    const payload = {
      apiKey: this.config.apiKey || '',
      userName: this.config.userName || 'there',
      tone: this.config.tone || 'warm'
    };

    this.http.post<any>(`${environment.apiUrl}/ai_briefing.php`, payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.success && res.briefing) {
          this.briefingFailed = false;
          this.displayedText = res.briefing;
          this.provider = res.provider || 'ambient_engine';
          this.geminiError = res.geminiError || '';
          this.lastSync = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (this.isLive) {
          this.briefingFailed = true;
          this.displayedText = '';
          this.geminiError = res?.geminiError || '';
        } else {
          this.displayedText = "Good day! Everything is currently running smoothly on your schedule and home systems.";
          this.provider = 'ambient_engine';
          this.geminiError = res?.geminiError || '';
        }
      },
      error: (err) => {
        this.loading = false;
        if (this.isLive) {
          this.briefingFailed = true;
          this.displayedText = '';
          this.geminiError = err?.error?.error || 'Network error';
          return;
        }
        this.displayedText = "Welcome to your day! All calendar appointments and ambient notifications are synced.";
        this.provider = 'ambient_engine';
        this.geminiError = err?.error?.error || 'Network error';
      }
    });
  }

  toggleSpeak(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      return;
    }

    if (!this.displayedText) return;
    const utterance = new SpeechSynthesisUtterance(this.displayedText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => this.isSpeaking = false;
    utterance.onerror = () => this.isSpeaking = false;

    this.isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
