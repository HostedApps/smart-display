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

/** How long before a page change the next page is mounted (hidden) so it's built and painted in advance */
export const PAGE_PRELOAD_SECONDS = 4;

/**
 * The widgets the screen keeps mounted: the current page, plus the page being prepared in the
 * background (`staged`) and the page fading out (`leaving`). Widgets on those two are mounted but
 * invisible (`offstage`). Keeps the layout's stacking order; shared widgets appear once.
 */
export function widgetsToRender<W extends Pick<Widget, 'id' | 'page_id' | 'allPages'>>(
  widgets: readonly W[],
  pages: readonly DisplayPage[],
  activeIndex: number,
  stagedIndex: number | null = null,
  leavingIndex: number | null = null
): { widgets: W[]; offstage: Set<W['id']> } {
  if (pages.length <= 1) return { widgets: [...widgets], offstage: new Set() };
  const active = pages[activeIndex]?.id ?? pages[0].id;
  const extra = new Set([stagedIndex, leavingIndex].filter((i): i is number => i !== null && i !== activeIndex && !!pages[i]).map(i => pages[i].id));
  const list: W[] = [];
  const offstage = new Set<W['id']>();
  for (const w of widgets) {
    if (isWidgetOnPage(w, active, pages)) {
      list.push(w);
    } else if (extra.has(homePageId(w, pages))) {
      list.push(w);
      offstage.add(w.id);
    }
  }
  return { widgets: list, offstage };
}
