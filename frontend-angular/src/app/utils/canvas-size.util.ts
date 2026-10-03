import { DisplayOrientation } from '../models/display.model';

export interface CanvasSize {
  width: number;
  height: number;
}

const PRESET_SIZES: Record<string, CanvasSize> = {
  landscape_720p: { width: 1280, height: 720 },
  landscape_1080p: { width: 1920, height: 1080 },
  landscape_1440p: { width: 2560, height: 1440 },
  landscape_4k: { width: 3840, height: 2160 },
  portrait_720p: { width: 720, height: 1280 },
  portrait_1080p: { width: 1080, height: 1920 },
  portrait_1440p: { width: 1440, height: 2560 },
  portrait_4k: { width: 2160, height: 3840 },
  landscape_16_10: { width: 1920, height: 1200 },
  portrait_16_10: { width: 1200, height: 1920 },
  landscape_4_3: { width: 1600, height: 1200 },
  portrait_4_3: { width: 1200, height: 1600 },
  ultrawide: { width: 3440, height: 1440 }
};

const MIN_SIDE = 200;
const MAX_SIDE = 7680;

/** Design-canvas size for a display; freeform uses the saved custom size (default 1024×1024). */
export function getCanvasSize(orientation?: DisplayOrientation | string | null, custom?: Partial<CanvasSize> | null): CanvasSize {
  if (orientation === 'freeform') {
    return {
      width: clampSide(custom?.width, 1024),
      height: clampSide(custom?.height, 1024)
    };
  }
  return PRESET_SIZES[orientation || ''] || PRESET_SIZES['landscape_720p'];
}

function clampSide(value: number | undefined, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(Math.min(MAX_SIDE, Math.max(MIN_SIDE, n)));
}

export type ScaleMode = 'fit' | 'fill' | 'stretch' | 'none';

export interface StageTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * How to place a design canvas on a screen.
 * fit: whole layout visible, letterboxed · fill: covers the screen, edges may crop ·
 * stretch: covers exactly, aspect may distort · none: 1:1 pixels from the top-left (legacy).
 * safeArea is a 0–0.1 fraction inset on every side for TVs that overscan.
 */
export function computeStageTransform(design: CanvasSize, screen: CanvasSize, mode: ScaleMode = 'fit', safeArea = 0): StageTransform {
  if (mode === 'none') {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }
  const inset = Math.min(0.1, Math.max(0, safeArea || 0));
  const availW = screen.width * (1 - 2 * inset);
  const availH = screen.height * (1 - 2 * inset);
  let scaleX = availW / design.width;
  let scaleY = availH / design.height;
  if (mode === 'fit') {
    scaleX = scaleY = Math.min(scaleX, scaleY);
  } else if (mode === 'fill') {
    scaleX = scaleY = Math.max(scaleX, scaleY);
  }
  return {
    scaleX,
    scaleY,
    offsetX: (screen.width - design.width * scaleX) / 2,
    offsetY: (screen.height - design.height * scaleY) / 2
  };
}
