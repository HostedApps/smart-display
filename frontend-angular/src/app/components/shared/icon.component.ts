import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Icon paths from Lucide (https://lucide.dev), lucide-static v0.460.0.
 * ISC License — Copyright (c) Lucide Contributors 2022; portions (c) Cole Bemis 2013-2022 (Feather, MIT).
 * Only the icons the app uses are inlined, to keep the bundle small. Add more by copying the inner
 * markup of the matching file from lucide-static/icons/<name>.svg.
 */
const ICONS: Record<string, string> = {
  'youtube': '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/> <path d="m10 15 5-3-5-3z"/>',
  'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/> <path d="M20 3v4"/> <path d="M22 5h-4"/> <path d="M4 17v2"/> <path d="M5 18H3"/>',
  'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/> <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/> <path d="M4 22h16"/> <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/> <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/> <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'cctv': '<path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/> <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/> <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/> <path d="M2 21v-4"/> <path d="M7 9h.01"/>',
  'car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/> <circle cx="7" cy="17" r="2"/> <path d="M9 17h6"/> <circle cx="17" cy="17" r="2"/>',
  'clock': '<circle cx="12" cy="12" r="10"/> <polyline points="12 6 12 12 16 14"/>',
  'cloud-sun': '<path d="M12 2v2"/> <path d="m4.93 4.93 1.41 1.41"/> <path d="M20 12h2"/> <path d="m19.07 4.93-1.41 1.41"/> <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/> <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  'calendar-days': '<path d="M8 2v4"/> <path d="M16 2v4"/> <rect width="18" height="18" x="3" y="4" rx="2"/> <path d="M3 10h18"/> <path d="M8 14h.01"/> <path d="M12 14h.01"/> <path d="M16 14h.01"/> <path d="M8 18h.01"/> <path d="M12 18h.01"/> <path d="M16 18h.01"/>',
  'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/> <circle cx="9" cy="9" r="2"/> <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'newspaper': '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/> <path d="M18 14h-8"/> <path d="M15 18h-5"/> <path d="M10 6h8v4h-8V6Z"/>',
  'list-checks': '<path d="m3 17 2 2 4-4"/> <path d="m3 7 2 2 4-4"/> <path d="M13 6h8"/> <path d="M13 12h8"/> <path d="M13 18h8"/>',
  'house': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/> <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'music': '<path d="M9 18V5l12-2v13"/> <circle cx="6" cy="18" r="3"/> <circle cx="18" cy="16" r="3"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/> <polyline points="16 7 22 7 22 13"/>',
  'sticky-note': '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/> <path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  'hourglass': '<path d="M5 22h14"/> <path d="M5 2h14"/> <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/> <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/> <path d="M7 2v20"/> <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  'radar': '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/> <path d="M4 6h.01"/> <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/> <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/> <path d="M12 18h.01"/> <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/> <circle cx="12" cy="12" r="2"/> <path d="m13.41 10.59 5.66-5.66"/>',
  'quote': '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/> <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  'type': '<polyline points="4 7 4 4 20 4 20 7"/> <line x1="9" x2="15" y1="20" y2="20"/> <line x1="12" x2="12" y1="4" y2="20"/>',
  'qr-code': '<rect width="5" height="5" x="3" y="3" rx="1"/> <rect width="5" height="5" x="16" y="3" rx="1"/> <rect width="5" height="5" x="3" y="16" rx="1"/> <path d="M21 16h-3a2 2 0 0 0-2 2v3"/> <path d="M21 21v.01"/> <path d="M12 7v3a2 2 0 0 1-2 2H7"/> <path d="M3 12h.01"/> <path d="M12 3h.01"/> <path d="M12 16v.01"/> <path d="M16 12h1"/> <path d="M21 12v.01"/> <path d="M12 21v-1"/>',
  'globe': '<circle cx="12" cy="12" r="10"/> <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/> <path d="M2 12h20"/>',
  'shapes': '<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/> <rect x="3" y="14" width="7" height="7" rx="1"/> <circle cx="17.5" cy="17.5" r="3.5"/>',
  'calendar-clock': '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/> <path d="M16 2v4"/> <path d="M8 2v4"/> <path d="M3 10h5"/> <path d="M17.5 17.5 16 16.3V14"/> <circle cx="16" cy="16" r="6"/>',
  'mouse-pointer-click': '<path d="M14 4.1 12 6"/> <path d="m5.1 8-2.9-.8"/> <path d="m6 12-1.9 2"/> <path d="M7.2 2.2 8 5.1"/> <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
  'sunrise': '<path d="M12 2v8"/> <path d="m4.93 10.93 1.41 1.41"/> <path d="M2 18h2"/> <path d="M20 18h2"/> <path d="m19.07 10.93-1.41 1.41"/> <path d="M22 22H2"/> <path d="m8 6 4-4 4 4"/> <path d="M16 18a4 4 0 0 0-8 0"/>',
  'clock-3': '<circle cx="12" cy="12" r="10"/> <polyline points="12 6 12 12 16.5 12"/>',
  'plug': '<path d="M12 22v-5"/> <path d="M9 8V2"/> <path d="M15 8V2"/> <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  'gauge': '<path d="m12 14 4-4"/> <path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  'pen-line': '<path d="M12 20h9"/> <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  'map': '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/> <path d="M15 5.764v15"/> <path d="M9 3.236v15"/>',
  'slack': '<rect width="3" height="8" x="13" y="2" rx="1.5"/> <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/> <rect width="3" height="8" x="8" y="14" rx="1.5"/> <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/> <rect width="8" height="3" x="14" y="13" rx="1.5"/> <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5"/> <rect width="8" height="3" x="2" y="8" rx="1.5"/> <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5"/>',
  'mail': '<rect width="20" height="16" x="2" y="4" rx="2"/> <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'chart-candlestick': '<path d="M9 5v4"/> <rect width="4" height="6" x="7" y="9" rx="1"/> <path d="M9 15v2"/> <path d="M17 3v2"/> <rect width="4" height="8" x="15" y="5" rx="1"/> <path d="M17 13v3"/> <path d="M3 3v16a2 2 0 0 0 2 2h16"/>',
  'images': '<path d="M18 22H4a2 2 0 0 1-2-2V6"/> <path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/> <circle cx="12" cy="8" r="2"/> <rect width="16" height="16" x="6" y="2" rx="2"/>',
  'book-open': '<path d="M12 7v14"/> <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/> <path d="M14 2v4a2 2 0 0 0 2 2h4"/> <path d="M10 9H8"/> <path d="M16 13H8"/> <path d="M16 17H8"/>',
  'layout-template': '<rect width="18" height="7" x="3" y="3" rx="1"/> <rect width="9" height="7" x="3" y="14" rx="1"/> <rect width="5" height="7" x="16" y="14" rx="1"/>',
  'wand-sparkles': '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/> <path d="m14 7 3 3"/> <path d="M5 6v4"/> <path d="M19 14v4"/> <path d="M10 2v2"/> <path d="M7 8H3"/> <path d="M21 16h-4"/> <path d="M11 3H9"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/> <path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'lock-open': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/> <path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  'eye-off': '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/> <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/> <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/> <path d="m2 2 20 20"/>',
  'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/> <circle cx="12" cy="12" r="3"/>',
  'x': '<path d="M18 6 6 18"/> <path d="m6 6 12 12"/>',
  'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/> <path d="M12 9v4"/> <path d="M12 17h.01"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/> <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'tablet-smartphone': '<rect width="10" height="14" x="3" y="8" rx="2"/> <path d="M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4"/> <path d="M8 18h.01"/>',
  'code': '<polyline points="16 18 22 12 16 6"/> <polyline points="8 6 2 12 8 18"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'plus': '<path d="M5 12h14"/> <path d="M12 5v14"/>',
  'crown': '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/> <path d="M5 21h14"/>',
  'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/> <line x1="8" x2="16" y1="21" y2="21"/> <line x1="12" x2="12" y1="17" y2="21"/>',
  'radio-tower': '<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/> <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/> <circle cx="12" cy="9" r="2"/> <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/> <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/> <path d="M9.5 18h5"/> <path d="m8 22 4-11 4 11"/>',
  'siren': '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/> <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/> <path d="M21 12h1"/> <path d="M18.5 4.5 18 5"/> <path d="M2 12h1"/> <path d="M12 2v1"/> <path d="m4.929 4.929.707.707"/> <path d="M12 12v6"/>',
  'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/> <path d="m15 5 4 4"/>',
  'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/> <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/> <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/> <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/> <path d="M12 18h.01"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'trash-2': '<path d="M3 6h18"/> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/> <line x1="10" x2="10" y1="11" y2="17"/> <line x1="14" x2="14" y1="11" y2="17"/>',
  'undo-2': '<path d="M9 14 4 9l5-5"/> <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  'redo-2': '<path d="m15 14 5-5-5-5"/> <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>',
  'octagon-alert': '<path d="M12 16h.01"/> <path d="M12 8v4"/> <path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
  'search': '<circle cx="11" cy="11" r="8"/> <path d="m21 21-4.3-4.3"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'copy-plus': '<line x1="15" x2="15" y1="12" y2="18"/> <line x1="12" x2="18" y1="15" y2="15"/> <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'align-horizontal-justify-start': '<rect width="6" height="14" x="6" y="5" rx="2"/> <rect width="6" height="10" x="16" y="7" rx="2"/> <path d="M2 2v20"/>',
  'align-horizontal-justify-center': '<rect width="6" height="14" x="2" y="5" rx="2"/> <rect width="6" height="10" x="16" y="7" rx="2"/> <path d="M12 2v20"/>',
  'align-horizontal-justify-end': '<rect width="6" height="14" x="2" y="5" rx="2"/> <rect width="6" height="10" x="12" y="7" rx="2"/> <path d="M22 2v20"/>',
  'align-vertical-justify-start': '<rect width="14" height="6" x="5" y="16" rx="2"/> <rect width="10" height="6" x="7" y="6" rx="2"/> <path d="M2 2h20"/>',
  'align-vertical-justify-center': '<rect width="14" height="6" x="5" y="16" rx="2"/> <rect width="10" height="6" x="7" y="2" rx="2"/> <path d="M2 12h20"/>',
  'align-vertical-justify-end': '<rect width="14" height="6" x="5" y="12" rx="2"/> <rect width="10" height="6" x="7" y="2" rx="2"/> <path d="M2 22h20"/>',
  'history': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/> <path d="M3 3v5h5"/> <path d="M12 7v5l4 2"/>',
  'monitor-smartphone': '<path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"/> <path d="M10 19v-3.96 3.15"/> <path d="M7 19h5"/> <rect width="6" height="10" x="16" y="12" rx="2"/>',
  'tv': '<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/> <polyline points="17 2 12 7 7 2"/>',
  'tablet': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/> <line x1="12" x2="12.01" y1="18" y2="18"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'laptop': '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  'rotate-cw': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/> <path d="M21 3v5h-5"/>',
  'scan-eye': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/> <path d="M17 3h2a2 2 0 0 1 2 2v2"/> <path d="M21 17v2a2 2 0 0 1-2 2h-2"/> <path d="M7 21H5a2 2 0 0 1-2-2v-2"/> <circle cx="12" cy="12" r="1"/> <path d="M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'sun': '<circle cx="12" cy="12" r="4"/> <path d="M12 2v2"/> <path d="M12 20v2"/> <path d="m4.93 4.93 1.41 1.41"/> <path d="m17.66 17.66 1.41 1.41"/> <path d="M2 12h2"/> <path d="M20 12h2"/> <path d="m6.34 17.66-1.41 1.41"/> <path d="m19.07 4.93-1.41 1.41"/>',
  'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/> <circle cx="12" cy="13" r="3"/>',
  'ellipsis': '<circle cx="12" cy="12" r="1"/> <circle cx="19" cy="12" r="1"/> <circle cx="5" cy="12" r="1"/>',
  'external-link': '<path d="M15 3h6v6"/> <path d="M10 14 21 3"/> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
};

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    [attr.width]="size" [attr.height]="size" [attr.stroke-width]="strokeWidth" stroke-linecap="round" stroke-linejoin="round"
    [attr.aria-hidden]="label ? null : 'true'" [attr.role]="label ? 'img' : null" [attr.aria-label]="label || null"
    [innerHTML]="markup"></svg>`,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 0; vertical-align: -0.15em; }`]
})
export class IconComponent {
  @Input() size: number | string = 16;
  @Input() strokeWidth: number | string = 2;
  /** Accessible name; omit for decorative icons next to visible text */
  @Input() label = '';
  markup: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  @Input() set name(value: string) {
    // Markup comes only from the static ICONS table above, never from user input
    this.markup = this.sanitizer.bypassSecurityTrustHtml(ICONS[value] || '');
  }
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
