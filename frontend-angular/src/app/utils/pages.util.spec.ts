import { DisplayPage } from '../models/display.model';
import { homePageId, isWidgetOnPage, rotationCycleSeconds } from './pages.util';

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
