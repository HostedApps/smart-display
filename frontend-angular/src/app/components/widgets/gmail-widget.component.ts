import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { GmailConfig, GmailEmailPreview } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-gmail-widget',
  template: `
    <div class="gmail-card sd-card">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
      <div class="gmail-header">
        <div class="header-left">
          <svg class="gmail-icon" viewBox="0 0 24 24" fill="none">
            <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#EA4335" opacity="0.2"/>
            <path d="M20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#EA4335"/>
            <path d="M4 6L12 11L20 6V4H4V6Z" fill="#EA4335"/>
          </svg>
          <div class="header-text">
            <span class="gmail-title">{{ config.title || 'Gmail Inbox' }}</span>
            <span class="account-email" *ngIf="config.accountEmail">{{ config.accountEmail }}</span>
          </div>
        </div>

        <div class="unread-badge" *ngIf="!(isLive && showingSample)">
          <span class="badge-count">{{ unreadCount }}</span>
          <span class="badge-label">unread</span>
        </div>
      </div>

      <div class="emails-list">
        <div *ngFor="let em of displayEmails" class="email-item" [class.is-unread]="em.unread">
          <div class="unread-dot" *ngIf="em.unread"></div>
          <div class="email-content">
            <div class="email-meta">
              <span class="sender-name">{{ em.from }}</span>
              <span class="email-time">{{ em.timeAgo }}</span>
            </div>
            <div class="email-subject">{{ em.subject }}</div>
            <div class="email-snippet">{{ em.snippet }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gmail-card {
      position: relative;
      height: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .gmail-header {
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
      gap: 8px;
    }
    .gmail-icon {
      width: 20px;
      height: 20px;
    }
    .header-text {
      display: flex;
      flex-direction: column;
    }
    .gmail-title {
      font-size: var(--sd-fs-body);
      font-weight: 600;
      color: var(--sd-text);
      line-height: 1.2;
    }
    .account-email {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
    }
    .unread-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--sd-danger-soft);
      border: var(--sd-border-width) solid var(--sd-danger);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .badge-count {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-danger);
    }
    .badge-label {
      font-size: var(--sd-fs-xs);
      color: var(--sd-danger);
      text-transform: uppercase;
      font-weight: 600;
    }
    .emails-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
    }
    .email-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 8px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      position: relative;
    }
    .email-item.is-unread {
      background: var(--sd-surface-3);
    }
    .unread-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--sd-accent);
      box-shadow: 0 0 6px var(--sd-accent);
      margin-top: 4px;
      flex-shrink: 0;
    }
    .email-content {
      flex: 1;
      overflow: hidden;
    }
    .email-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1px;
    }
    .sender-name {
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-time {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      white-space: nowrap;
      margin-left: 6px;
    }
    .email-subject {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      color: var(--sd-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-snippet {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
  `]
})
export class GmailWidgetComponent implements OnInit {
  @Input() config: GmailConfig = {
    title: 'Gmail Inbox',
    accountEmail: 'family@smart-kiosk.online',
    unreadCount: 3,
    emails: []
  };

  private defaultEmails: GmailEmailPreview[] = [
    {
      id: '1',
      from: 'Principal Johnson',
      subject: 'School Fall Festival & Book Fair Next Friday',
      snippet: 'Join us next Friday at 4 PM for our annual fall carnival with games and book fair...',
      timeAgo: '18m ago',
      unread: true
    },
    {
      id: '2',
      from: 'Amazon.com',
      subject: 'Your package has been delivered to your front porch',
      snippet: 'Track package #402-9182371-29182 delivered near your front door at 1:15 PM...',
      timeAgo: '1h ago',
      unread: true
    },
    {
      id: '3',
      from: 'Dr. Emily Carter',
      subject: 'Appointment Confirmation for Tuesday 10:00 AM',
      snippet: 'This is a confirmation of your upcoming routine dental cleaning appointment...',
      timeAgo: '3h ago',
      unread: true
    }
  ];

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when showing the built-in example inbox (or the default unread count) instead of configured data. */
  get showingSample(): boolean {
    const hasEmails = Array.isArray(this.config.emails) && this.config.emails.length > 0;
    return !hasEmails || this.config.unreadCount === undefined;
  }

  get unreadCount(): number {
    return this.config.unreadCount !== undefined ? this.config.unreadCount : 3;
  }

  get displayEmails(): GmailEmailPreview[] {
    if (this.config.emails && Array.isArray(this.config.emails) && this.config.emails.length > 0) {
      return this.config.emails;
    }
    return this.defaultEmails;
  }

  ngOnInit(): void {}
}
