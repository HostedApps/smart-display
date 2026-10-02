import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { GmailConfig, GmailEmailPreview } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-gmail-widget',
  template: `
    <div class="gmail-card">
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
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px 14px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
      font-size: 0.9rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.2;
    }
    .account-email {
      font-size: 0.65rem;
      color: #94a3b8;
    }
    .unread-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .badge-count {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f87171;
    }
    .badge-label {
      font-size: 0.6rem;
      color: #fca5a5;
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
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      position: relative;
    }
    .email-item.is-unread {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .unread-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #38bdf8;
      box-shadow: 0 0 6px #38bdf8;
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
      font-size: 0.75rem;
      font-weight: 700;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-time {
      font-size: 0.6rem;
      color: #94a3b8;
      white-space: nowrap;
      margin-left: 6px;
    }
    .email-subject {
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-snippet {
      font-size: 0.65rem;
      color: #64748b;
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
