import { Component, Inject, Input, OnInit, OnDestroy, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { SlackConfig, SlackMessage } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-slack-widget',
  template: `
    <div class="slack-card sd-card">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
      <div class="slack-header">
        <div class="header-left">
          <svg class="slack-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          <span class="channel-tag">#{{ config.channelName || 'general' }}</span>
        </div>
        <span class="live-pill" *ngIf="!(isLive && showingSample)">
          <span class="pulse-dot"></span> Live
        </span>
      </div>

      <div class="messages-list">
        <div *ngFor="let msg of displayMessages" class="message-item">
          <div class="user-avatar">{{ msg.avatar || '👤' }}</div>
          <div class="message-content">
            <div class="msg-meta">
              <span class="user-name">{{ msg.user }}</span>
              <span class="msg-time">{{ msg.timestamp }}</span>
            </div>
            <div class="msg-body">{{ msg.text }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slack-card {
      position: relative;
      height: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .slack-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: var(--sd-border);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .slack-logo {
      width: 16px;
      height: 16px;
      color: #e01e5a;
    }
    .channel-tag {
      font-size: var(--sd-fs-body);
      font-weight: 700;
      color: var(--sd-text);
      letter-spacing: -0.2px;
    }
    .live-pill {
      font-size: var(--sd-fs-xs);
      color: var(--sd-success);
      background: var(--sd-success-soft);
      border: 1px solid var(--sd-success);
      padding: 1px 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--sd-success);
      box-shadow: 0 0 6px var(--sd-success);
    }
    .messages-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
    }
    .message-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 8px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
    }
    .user-avatar {
      font-size: 1.1rem;
      line-height: 1;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .message-content {
      flex: 1;
      overflow: hidden;
    }
    .msg-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .user-name {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-text);
    }
    .msg-time {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
    }
    .msg-body {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      line-height: 1.35;
      word-break: break-word;
    }
  `]
})
export class SlackWidgetComponent implements OnInit, OnDestroy {
  @Input() config: SlackConfig = {
    title: 'Slack Feed',
    channelName: 'announcements',
    messages: [],
    maxItems: 5
  };

  private pollSub?: Subscription;

  private defaultMessages: SlackMessage[] = [
    {
      id: '1',
      user: 'Sarah Miller',
      avatar: '👩🏻‍💻',
      text: '🚀 The new product release is live in production! Great teamwork everyone.',
      timestamp: '12m ago'
    },
    {
      id: '2',
      user: 'David Chen',
      avatar: '👨🏽‍💻',
      text: 'Reminder: Design sync meeting moved to 3:30 PM today in Room A.',
      timestamp: '45m ago'
    },
    {
      id: '3',
      user: 'Alex Rivera',
      avatar: '⚡',
      text: 'Server deployment corelabel-infraRA running healthy with 0 errors.',
      timestamp: '1h ago'
    }
  ];

  /** True when showing the built-in example messages instead of configured ones. */
  get showingSample(): boolean {
    return !(Array.isArray(this.config.messages) && this.config.messages.length > 0);
  }

  get displayMessages(): SlackMessage[] {
    if (this.config.messages && Array.isArray(this.config.messages) && this.config.messages.length > 0) {
      return this.config.messages.slice(0, this.config.maxItems || 5);
    }
    return this.defaultMessages.slice(0, this.config.maxItems || 5);
  }

  readonly isLive: boolean;

  constructor(private http: HttpClient, @Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    // If webhook configured, poll periodically
    if (this.config.webhookUrl) {
      this.pollSub = interval(60000).subscribe(() => {
        // Poll webhook
      });
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
