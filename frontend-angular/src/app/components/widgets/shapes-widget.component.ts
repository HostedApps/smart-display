import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-shapes-widget',
  template: `
    <div class="shapes-container">
      <div 
        *ngIf="shape === 'rectangle'" 
        class="shape-rectangle"
        [style.backgroundColor]="color"
        [style.opacity]="fillOpacity"
      ></div>

      <div 
        *ngIf="shape === 'circle'" 
        class="shape-circle"
        [style.backgroundColor]="color"
        [style.opacity]="fillOpacity"
      ></div>

      <div 
        *ngIf="shape === 'horizontal_line'" 
        class="shape-horizontal-line"
        [style.backgroundColor]="color"
        [style.opacity]="fillOpacity"
      ></div>

      <div 
        *ngIf="shape === 'vertical_line'" 
        class="shape-vertical-line"
        [style.backgroundColor]="color"
        [style.opacity]="fillOpacity"
      ></div>
    </div>
  `,
  styles: [`
    .shapes-container {
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      /* Purely the shape itself - no card background, no border, no backdrop-filter */
      background: transparent;
      border: none;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .shape-rectangle {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }

    .shape-circle {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
    }

    .shape-horizontal-line {
      width: 100%;
      height: 3px;
      border-radius: 2px;
    }

    .shape-vertical-line {
      width: 3px;
      height: 100%;
      border-radius: 2px;
    }
  `]
})
export class ShapesWidgetComponent implements OnInit, OnChanges {
  @Input() config: any = {
    shape: 'rectangle',
    color: '#6366f1',
    fillOpacity: 0.3
  };

  get shape(): 'rectangle' | 'circle' | 'horizontal_line' | 'vertical_line' {
    return this.config?.shape || 'rectangle';
  }

  get color(): string {
    return this.config?.color || '#6366f1';
  }

  get fillOpacity(): number {
    return this.config?.fillOpacity !== undefined ? Number(this.config.fillOpacity) : 0.3;
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {}
}
