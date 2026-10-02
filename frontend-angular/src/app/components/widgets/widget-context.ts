import { InjectionToken } from '@angular/core';

/**
 * Provided as `true` by the kiosk display viewer. Widgets inject it (optionally) to tell
 * a live wall display apart from the editor canvas: the editor may show sample content as
 * a preview, but a live display must never present invented data as if it were real.
 */
export const LIVE_DISPLAY = new InjectionToken<boolean>('LIVE_DISPLAY');
