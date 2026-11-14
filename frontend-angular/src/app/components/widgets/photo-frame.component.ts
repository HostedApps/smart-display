import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { photoFrame, PhotoFrameTheme } from './photo-frames';

/**
 * Festive frame drawn over the Photos widget. Sits above the slideshow and ignores the pointer.
 * Its band width comes from --pf-w (set by the photo widget, scales with the widget box).
 */
@Component({
  selector: 'app-photo-frame',
  standalone: true,
  imports: [NgIf, NgFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="frame">
      <div class="pf-base" [style.border-color]="frame.bandColor"></div>
      <div class="pf-band" [style.border-image-source]="frame.band"></div>
      <div class="pf-toran" *ngIf="frame.toran" [style.background-image]="frame.toran"></div>
      <div *ngFor="let o of frame.ornaments" [class]="'pf-orn pf-' + o.at" [style.background-image]="o.image"></div>
    </ng-container>
  `,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
    }
    .pf-base {
      position: absolute;
      inset: 0;
      border: calc(var(--pf-w, 24px) - 1px) solid transparent;
    }
    .pf-band {
      position: absolute;
      inset: 0;
      border: var(--pf-w, 24px) solid transparent;
      border-image-slice: 30;
      border-image-repeat: round;
    }
    .pf-toran {
      position: absolute;
      left: var(--pf-w, 24px);
      right: var(--pf-w, 24px);
      top: calc(var(--pf-w, 24px) - 2px);
      height: calc(var(--pf-w, 24px) * 1.15);
      background-repeat: round no-repeat;
      background-size: auto 100%;
    }
    .pf-orn {
      position: absolute;
      width: calc(var(--pf-w, 24px) * 2.4);
      height: calc(var(--pf-w, 24px) * 2.4);
      background-position: center bottom;
      background-repeat: no-repeat;
      background-size: contain;
    }
    .pf-tl { top: calc(var(--pf-w, 24px) * 0.4); left: calc(var(--pf-w, 24px) * 0.4); }
    .pf-tr { top: calc(var(--pf-w, 24px) * 0.4); right: calc(var(--pf-w, 24px) * 0.4); }
    .pf-bl { bottom: calc(var(--pf-w, 24px) * 0.3); left: calc(var(--pf-w, 24px) * 0.4); }
    .pf-br { bottom: calc(var(--pf-w, 24px) * 0.3); right: calc(var(--pf-w, 24px) * 0.4); }
    .pf-bc { bottom: calc(var(--pf-w, 24px) * 0.3); left: 50%; transform: translateX(-50%); }
  `]
})
export class PhotoFrameComponent implements OnChanges {
  @Input() theme: string | null | undefined;
  frame: PhotoFrameTheme | null = null;

  ngOnChanges(): void {
    this.frame = photoFrame(this.theme);
  }
}
