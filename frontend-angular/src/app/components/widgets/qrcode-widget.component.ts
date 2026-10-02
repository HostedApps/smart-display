import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-qrcode-widget',
  template: `
    <div class="qrcode-card sd-card">
      <div class="qrcode-content">
        <div class="qr-frame">
          <img 
            [src]="qrCodeUrl" 
            [alt]="config?.label || 'QR Code'" 
            class="qr-image"
            [style.width.px]="qrSize"
            [style.height.px]="qrSize"
            loading="lazy"
          />
        </div>
        <p class="qr-label" *ngIf="config?.label">{{ config.label }}</p>
      </div>
    </div>
  `,
  styles: [`
    .qrcode-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .qrcode-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      max-width: 100%;
      max-height: 100%;
    }

    .qr-frame {
      background: #ffffff;
      padding: 12px;
      border-radius: 14px;
      border: var(--sd-border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }

    .qr-frame:hover {
      transform: scale(1.02);
    }

    .qr-image {
      display: block;
      border-radius: 4px;
      image-rendering: pixelated;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .qr-label {
      margin: 12px 0 0 0;
      font-family: var(--font-main, sans-serif);
      font-size: var(--sd-fs-title);
      font-weight: 600;
      color: var(--sd-text);
      letter-spacing: 0.2px;
      line-height: 1.35;
      max-width: 90%;
      word-break: break-word;
    }
  `]
})
export class QrcodeWidgetComponent implements OnInit, OnChanges {
  @Input() config: any = {
    data: 'https://smart-kiosk.online',
    label: 'Scan to connect',
    size: 180
  };

  qrCodeUrl: string = '';

  get qrSize(): number {
    return this.config?.size || 180;
  }

  ngOnInit(): void {
    this.generateQrUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.generateQrUrl();
  }

  private generateQrUrl(): void {
    const data = this.config?.data || 'https://smart-kiosk.online';
    const size = this.config?.size || 200;
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  }
}
