import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { ChoresConfig, FamilyMember, ChoreItem } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-chores-widget',
  template: `
    <div class="chores-card sd-card">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
      <canvas id="confetti-canvas-{{ widgetId }}" class="confetti-canvas"></canvas>

      <!-- Header with Title & Active Member Filter -->
      <div class="chores-header">
        <div class="title-row">
          <span class="widget-badge">🏆 FAMILY CHORES & HABITS</span>
          <span class="total-pts-badge" *ngIf="!(isLive && showingSample)">🪙 {{ totalFamilyPoints }} pts</span>
        </div>

        <!-- Family Member Avatar Tabs -->
        <div class="members-bar">
          <button 
            *ngFor="let member of members"
            [class.active]="selectedMemberId === member.id"
            (click)="selectMember(member.id)"
            class="member-pill"
          >
            <span class="member-avatar">{{ member.avatar }}</span>
            <span class="member-name">{{ member.name }}</span>
            <span class="member-streak">🔥 {{ member.streak }}d</span>
          </button>
        </div>
      </div>

      <!-- Chores List -->
      <div class="chores-list">
        <div 
          *ngFor="let chore of filteredChores" 
          class="chore-row"
          [class.completed]="chore.completed"
          (click)="toggleChore(chore)"
        >
          <div class="chore-check">
            <span *ngIf="chore.completed">✓</span>
          </div>
          <span class="chore-title">{{ chore.title }}</span>
          <span class="chore-pts-tag">+{{ chore.points }} pts</span>
        </div>

        <div *ngIf="filteredChores.length === 0" class="no-chores">
          <span>🎉 All chores completed for today! Awesome job!</span>
        </div>
      </div>

      <!-- Footer Progress -->
      <div class="chores-footer">
        <div class="progress-track">
          <div class="progress-bar" [style.width.%]="completionPercentage"></div>
        </div>
        <span class="progress-label">{{ completedCount }} / {{ totalCount }} Completed ({{ completionPercentage }}%)</span>
      </div>
    </div>
  `,
  styles: [`
    .chores-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: var(--font-main, sans-serif);
      position: relative;
      overflow: hidden;
    }
    .confetti-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
    }

    .chores-header {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .widget-badge {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--sd-warning);
    }
    .total-pts-badge {
      background: var(--sd-warning-soft);
      border: 1px solid var(--sd-warning);
      color: var(--sd-warning);
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--sd-radius-sm);
    }

    .members-bar {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .member-pill {
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .member-pill:hover {
      background: var(--sd-surface-3);
    }
    .member-pill.active {
      background: var(--sd-accent);
      border-color: var(--sd-accent);
      color: var(--sd-on-accent);
      box-shadow: 0 0 10px var(--sd-accent-border);
    }
    .member-avatar { font-size: 0.95rem; }
    .member-streak {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: #f97316;
      background: rgba(249, 115, 22, 0.15);
      padding: 1px 5px;
      border-radius: 6px;
    }
    .member-pill.active .member-streak {
      background: rgba(0, 0, 0, 0.25);
      color: var(--sd-on-accent);
    }

    .chores-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
      flex: 1;
      overflow-y: auto;
    }
    .chore-row {
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .chore-row:hover {
      background: var(--sd-surface-3);
      border-color: var(--sd-accent-border);
      transform: translateX(2px);
    }
    .chore-row.completed {
      opacity: 0.55;
      background: var(--sd-success-soft);
      border-color: var(--sd-success-soft);
    }
    .chore-check {
      width: 18px;
      height: 18px;
      border-radius: 6px;
      border: 2px solid var(--sd-text-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--sd-fs-sm);
      font-weight: 800;
      color: var(--sd-on-accent);
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .chore-row.completed .chore-check {
      background: var(--sd-success);
      border-color: var(--sd-success);
    }
    .chore-title {
      flex: 1;
      font-size: var(--sd-fs-body);
      font-weight: 500;
      color: var(--sd-text);
    }
    .chore-row.completed .chore-title {
      text-decoration: line-through;
    }
    .chore-pts-tag {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-accent);
      background: var(--sd-accent-soft);
      padding: 2px 6px;
      border-radius: 6px;
    }
    .no-chores {
      text-align: center;
      padding: 20px;
      font-size: var(--sd-fs-body);
      color: var(--sd-success);
    }

    .chores-footer {
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-top: var(--sd-border);
      padding-top: 8px;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--sd-surface-3);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--sd-accent), var(--sd-success));
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .progress-label {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      text-align: right;
    }
  `]
})
export class ChoresWidgetComponent implements OnInit {
  @Input() config: ChoresConfig = {};
  widgetId: string = Math.random().toString(36).substring(2, 7);

  members: FamilyMember[] = [
    { id: '1', name: 'Lucas', avatar: '🦁', points: 140, streak: 5 },
    { id: '2', name: 'Emma', avatar: '🦄', points: 180, streak: 7 },
    { id: '3', name: 'Mom', avatar: '👑', points: 90, streak: 12 },
    { id: '4', name: 'Dad', avatar: '⚡', points: 110, streak: 4 }
  ];

  chores: ChoreItem[] = [
    { id: 'c1', memberId: '1', title: 'Make Bedroom Bed', points: 10, completed: true },
    { id: 'c2', memberId: '1', title: 'Feed the Dog 🐕', points: 15, completed: false },
    { id: 'c3', memberId: '1', title: 'Read 20 Mins 📚', points: 20, completed: false },
    { id: 'c4', memberId: '2', title: 'Violin Practice 🎻', points: 25, completed: true },
    { id: 'c5', memberId: '2', title: 'Clear Dinner Table', points: 15, completed: false },
    { id: 'c6', memberId: '3', title: 'Morning 5k Run 🏃‍♀️', points: 30, completed: true },
    { id: 'c7', memberId: '4', title: 'Take Out Trash 🗑️', points: 15, completed: false }
  ];

  selectedMemberId: string = '1';

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when the built-in example family or chore list is shown instead of configured data. */
  get showingSample(): boolean {
    return !(this.config.members && this.config.members.length > 0)
      || !(this.config.chores && this.config.chores.length > 0);
  }

  ngOnInit(): void {
    if (this.config.members && this.config.members.length > 0) {
      this.members = this.config.members;
    }
    if (this.config.chores && this.config.chores.length > 0) {
      this.chores = this.config.chores;
    }
    if (this.members.length > 0) {
      this.selectedMemberId = this.members[0].id;
    }
  }

  get filteredChores(): ChoreItem[] {
    return this.chores.filter(c => c.memberId === this.selectedMemberId);
  }

  get totalFamilyPoints(): number {
    return this.members.reduce((sum, m) => sum + m.points, 0);
  }

  get completedCount(): number {
    return this.filteredChores.filter(c => c.completed).length;
  }

  get totalCount(): number {
    return this.filteredChores.length;
  }

  get completionPercentage(): number {
    if (this.totalCount === 0) return 100;
    return Math.round((this.completedCount / this.totalCount) * 100);
  }

  selectMember(id: string): void {
    this.selectedMemberId = id;
  }

  toggleChore(chore: ChoreItem): void {
    chore.completed = !chore.completed;
    const member = this.members.find(m => m.id === chore.memberId);
    if (member) {
      if (chore.completed) {
        member.points += chore.points;
        this.fireConfetti();
        this.playSuccessChime();
      } else {
        member.points = Math.max(0, member.points - chore.points);
      }
    }
  }

  // Synthesize pleasant celebratory chime with Web Audio API
  private playSuccessChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.15); // C5
      playTone(659.25, 0.1, 0.15); // E5
      playTone(783.99, 0.2, 0.35); // G5
    } catch {}
  }

  // Lightweight particle confetti canvas animation
  private fireConfetti(): void {
    const canvas = document.getElementById(`confetti-canvas-${this.widgetId}`) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = canvas.parentElement?.clientHeight || 300;

    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
    const particles = Array.from({ length: 45 }).map(() => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 14,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.alpha -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      frame++;
      if (frame < 50) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  }
}
