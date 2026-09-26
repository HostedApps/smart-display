import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { WhiteboardStroke, WhiteboardConfig } from '../../models/display.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-whiteboard-widget',
  template: `
    <div class="whiteboard-card" [class]="currentBg">
      <!-- Toolbar -->
      <div class="wb-toolbar" (click)="$event.stopPropagation()">
        <div class="tool-group">
          <span class="wb-title">{{ config.title || 'Family Board' }}</span>
          <button 
            type="button" 
            class="wb-tool-btn" 
            [class.active]="currentTool === 'pen'"
            (click)="setTool('pen')" 
            title="Pen">
            ✏️
          </button>
          <button 
            type="button" 
            class="wb-tool-btn" 
            [class.active]="currentTool === 'highlighter'"
            (click)="setTool('highlighter')" 
            title="Highlighter">
            🖍️
          </button>
          <button 
            type="button" 
            class="wb-tool-btn" 
            [class.active]="currentTool === 'eraser'"
            (click)="setTool('eraser')" 
            title="Eraser">
            🧹
          </button>
        </div>

        <!-- Color Palette -->
        <div class="colors-group" *ngIf="currentTool !== 'eraser'">
          <button 
            type="button" 
            *ngFor="let c of colors" 
            class="color-dot"
            [class.active]="currentColor === c"
            [style.backgroundColor]="c"
            (click)="setColor(c)">
          </button>
        </div>

        <!-- Thickness & Actions -->
        <div class="actions-group">
          <div class="stroke-sizes">
            <button 
              type="button" 
              class="size-btn" 
              [class.active]="currentWidth === 3" 
              (click)="setWidth(3)">•</button>
            <button 
              type="button" 
              class="size-btn" 
              [class.active]="currentWidth === 7" 
              (click)="setWidth(7)">●</button>
            <button 
              type="button" 
              class="size-btn" 
              [class.active]="currentWidth === 14" 
              (click)="setWidth(14)">⬤</button>
          </div>

          <button type="button" class="btn-clear" (click)="clearCanvas()" title="Clear Board">
            Clear
          </button>
        </div>
      </div>

      <!-- Drawing Canvas Area -->
      <div class="canvas-wrapper" #wrapper>
        <canvas 
          #canvas 
          class="drawing-canvas"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointerleave)="onPointerUp($event)">
        </canvas>
      </div>
    </div>
  `,
  styles: [`
    .whiteboard-card {
      height: 100%;
      box-sizing: border-box;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .chalkboard {
      background: #111827;
      color: #f8fafc;
    }
    .whiteboard {
      background: #f8fafc;
      color: #0f172a;
    }
    .grid {
      background-color: #0f172a;
      background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0);
      background-size: 20px 20px;
      color: #f8fafc;
    }
    .wb-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
      z-index: 2;
    }
    .wb-title {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-right: 4px;
    }
    .tool-group, .colors-group, .actions-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .wb-tool-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .wb-tool-btn.active {
      background: rgba(56, 189, 248, 0.3);
      border-color: #38bdf8;
    }
    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid transparent;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .color-dot.active {
      transform: scale(1.25);
      border-color: #ffffff;
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
    }
    .stroke-sizes {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .size-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0 3px;
      line-height: 1;
    }
    .size-btn.active {
      color: #38bdf8;
      font-weight: 700;
    }
    .btn-clear {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-clear:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    .canvas-wrapper {
      flex: 1;
      position: relative;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    .drawing-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      touch-action: none;
      cursor: crosshair;
    }
  `]
})
export class WhiteboardWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: WhiteboardConfig = {
    title: 'Family Board',
    canvasBackground: 'chalkboard',
    strokes: [],
    allowTouchDraw: true
  };

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapper') wrapperRef!: ElementRef<HTMLDivElement>;

  colors = ['#ffffff', '#38bdf8', '#facc15', '#34d399', '#fb7185', '#c084fc'];
  currentColor = '#38bdf8';
  currentWidth = 3;
  currentTool: 'pen' | 'highlighter' | 'eraser' = 'pen';

  private isDrawing = false;
  private currentStroke: WhiteboardStroke | null = null;
  private displayToken: string = '';
  private syncTimeout: any;

  get currentBg(): string {
    return this.config.canvasBackground || 'chalkboard';
  }

  get strokes(): WhiteboardStroke[] {
    if (!this.config.strokes || !Array.isArray(this.config.strokes)) {
      this.config.strokes = [];
    }
    return this.config.strokes;
  }

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.displayToken = this.route.snapshot.paramMap.get('token') || '';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.resizeCanvas();
      this.redrawAll();
    }, 100);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
    this.redrawAll();
  }

  setTool(tool: 'pen' | 'highlighter' | 'eraser'): void {
    this.currentTool = tool;
  }

  setColor(color: string): void {
    this.currentColor = color;
    if (this.currentTool === 'eraser') {
      this.currentTool = 'pen';
    }
  }

  setWidth(width: number): void {
    this.currentWidth = width;
  }

  private resizeCanvas(): void {
    if (!this.canvasRef || !this.wrapperRef) return;
    const canvas = this.canvasRef.nativeElement;
    const wrapper = this.wrapperRef.nativeElement;
    const rect = wrapper.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(10, rect.width * dpr);
    canvas.height = Math.max(10, rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  private redrawAll(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    for (const stroke of this.strokes) {
      this.renderStroke(ctx, stroke);
    }
  }

  private renderStroke(ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke): void {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.width * 2;
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke.width * 2.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = stroke.width;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  onPointerDown(e: PointerEvent): void {
    if (this.config.allowTouchDraw === false) return;
    this.isDrawing = true;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.currentStroke = {
      color: this.currentColor,
      width: this.currentWidth,
      tool: this.currentTool,
      points: [{ x, y }]
    };

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, this.currentWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.currentTool === 'eraser' ? '#000000' : this.currentColor;
      if (this.currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.fill();
      ctx.restore();
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.currentStroke.points.push({ x, y });

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (ctx) {
      const pts = this.currentStroke.points;
      const len = pts.length;
      if (len >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (this.currentStroke.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = this.currentStroke.width * 2;
        } else if (this.currentStroke.tool === 'highlighter') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = this.currentStroke.color;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = this.currentStroke.width * 2.5;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = this.currentStroke.color;
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = this.currentStroke.width;
        }

        ctx.beginPath();
        ctx.moveTo(pts[len - 2].x, pts[len - 2].y);
        ctx.lineTo(pts[len - 1].x, pts[len - 1].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    if (this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.scheduleSync();
    }
    this.currentStroke = null;
  }

  clearCanvas(): void {
    this.config.strokes = [];
    this.redrawAll();

    if (this.displayToken) {
      this.http.post(`${environment.apiUrl}/whiteboard_sync.php`, {
        action: 'clear',
        token: this.displayToken
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  private scheduleSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      if (this.displayToken) {
        this.http.post(`${environment.apiUrl}/whiteboard_sync.php`, {
          action: 'save',
          token: this.displayToken,
          strokes: this.strokes,
          canvasBackground: this.currentBg
        }).subscribe({
          next: () => {},
          error: () => {}
        });
      }
    }, 1200);
  }

  ngOnDestroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
  }
}
