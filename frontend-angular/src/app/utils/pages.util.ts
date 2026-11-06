import { DisplayPage, Widget } from '../models/display.model';

/**
 * Whether a widget shows on a page. Pages are independent: a widget belongs to its own page only,
 * unless it's set to show on every page. A widget without a page (or whose page was deleted)
 * belongs to the first page. Used by both the kiosk viewer and the editor canvas.
 */
export function isWidgetOnPage(widget: Pick<Widget, 'page_id' | 'allPages'>, pageId: string, pages: readonly DisplayPage[]): boolean {
  if (widget.allPages || pages.length <= 1) return true;
  return homePageId(widget, pages) === pageId;
}

/** The page a widget belongs to (its page_id if that page exists, else the first page) */
export function homePageId(widget: Pick<Widget, 'page_id'>, pages: readonly DisplayPage[]): string {
  const first = pages[0]?.id ?? 'default';
  return widget.page_id && pages.some(p => p.id === widget.page_id) ? widget.page_id : first;
}

/** Total time for one full rotation through the given pages */
export function rotationCycleSeconds(pages: readonly DisplayPage[]): number {
  return pages.reduce((sum, p) => sum + Math.max(MIN_PAGE_SECONDS, p.duration_seconds || DEFAULT_PAGE_SECONDS), 0);
}

export const MIN_PAGE_SECONDS = 5;
export const DEFAULT_PAGE_SECONDS = 30;
