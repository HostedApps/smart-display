import { DisplayPage } from '../models/display.model';
import { homePageId, isWidgetOnPage, rotationCycleSeconds, widgetsToRender } from './pages.util';

describe('Pages: independent widgets', () => {
  const pages: DisplayPage[] = [
    { id: 'default', name: 'Main', duration_seconds: 30 },
    { id: 'page_2', name: 'Photos', duration_seconds: 45 },
  ];

  it('first-page widgets stay on the first page (they used to show on every page)', () => {
    const w = { page_id: 'default' };
    expect(isWidgetOnPage(w, 'default', pages)).toBeTrue();
    expect(isWidgetOnPage(w, 'page_2', pages)).toBeFalse();
  });

  it('a widget shows only on its own page', () => {
    expect(isWidgetOnPage({ page_id: 'page_2' }, 'page_2', pages)).toBeTrue();
    expect(isWidgetOnPage({ page_id: 'page_2' }, 'default', pages)).toBeFalse();
  });

  it('a widget without a page, or whose page was deleted, belongs to the first page', () => {
    expect(homePageId({}, pages)).toBe('default');
    expect(homePageId({ page_id: 'gone' }, pages)).toBe('default');
    expect(isWidgetOnPage({ page_id: 'gone' }, 'page_2', pages)).toBeFalse();
  });

  it('"show on every page" is an explicit choice', () => {
    expect(isWidgetOnPage({ page_id: 'default', allPages: true }, 'page_2', pages)).toBeTrue();
  });

  it('with a single page every widget shows', () => {
    expect(isWidgetOnPage({ page_id: 'whatever' }, 'default', [pages[0]])).toBeTrue();
  });

  it('a rotation cycle adds up page durations, with the 5 s minimum', () => {
    expect(rotationCycleSeconds([...pages, { id: 'p3', name: 'x', duration_seconds: 1 }])).toBe(30 + 45 + 5);
  });
});

describe('widgetsToRender (pages prepared in the background)', () => {
  const pages = [{ id: 'a', name: 'A', duration_seconds: 10 }, { id: 'b', name: 'B', duration_seconds: 10 }, { id: 'c', name: 'C', duration_seconds: 10 }];
  const ws = [
    { id: 1, page_id: 'a' }, { id: 2, page_id: 'b', allPages: true }, { id: 3, page_id: 'b' }, { id: 4, page_id: 'c' }, { id: 5 }
  ] as any[];
  const ids = (r: { widgets: any[] }) => r.widgets.map(w => w.id);

  it('shows only the current page (and shared widgets) normally', () => {
    const r = widgetsToRender(ws, pages, 0);
    expect(ids(r)).toEqual([1, 2, 5]);
    expect(r.offstage.size).toBe(0);
  });

  it('mounts the next page invisibly, in layout order, without duplicating shared widgets', () => {
    const r = widgetsToRender(ws, pages, 0, 1);
    expect(ids(r)).toEqual([1, 2, 3, 5]);
    expect([...r.offstage]).toEqual([3]);
  });

  it('keeps the page that is fading out mounted but invisible', () => {
    const r = widgetsToRender(ws, pages, 1, null, 0);
    expect(ids(r)).toEqual([1, 2, 3, 5]);
    expect([...r.offstage].sort()).toEqual([1, 5]);
  });

  it('ignores staging the page that is already showing, and single-page displays', () => {
    expect(widgetsToRender(ws, pages, 2, 2).offstage.size).toBe(0);
    expect(ids(widgetsToRender(ws, [pages[0]], 0, 1))).toEqual([1, 2, 3, 4, 5]);
  });
});
