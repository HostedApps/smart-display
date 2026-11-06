import { isNewBuild, mainBundleIn, runningMainBundle } from './build-update.util';

describe('New-build detection (kiosk auto-update)', () => {
  const html = (main: string) =>
    `<!doctype html><html><head><base href="/"></head><body><app-root></app-root>` +
    `<script src="runtime.5c7b7fae5ccac22f.js" type="module"></script>` +
    `<script src="polyfills.1914f782f57ca69f.js" type="module"></script>` +
    `<script src="${main}" type="module"></script></body></html>`;

  it('reads the hashed main bundle from index.html', () => {
    expect(mainBundleIn(html('main.ebef07105753c4c1.js'))).toBe('main.ebef07105753c4c1.js');
  });

  it('ignores dev builds and error pages', () => {
    expect(mainBundleIn(html('main.js'))).toBeNull();
    expect(mainBundleIn('<html><body>503 Service Unavailable</body></html>')).toBeNull();
    expect(mainBundleIn('')).toBeNull();
  });

  it('finds the bundle this page is running', () => {
    const doc = new DOMParser().parseFromString(html('main.0123456789abcdef.js'), 'text/html');
    expect(runningMainBundle(doc)).toBe('main.0123456789abcdef.js');
    const dev = new DOMParser().parseFromString(html('main.js'), 'text/html');
    expect(runningMainBundle(dev)).toBeNull();
  });

  it('reloads only for a different, readable production build', () => {
    expect(isNewBuild('main.aaaaaaaaaaaaaaaa.js', 'main.bbbbbbbbbbbbbbbb.js')).toBeTrue();
    expect(isNewBuild('main.aaaaaaaaaaaaaaaa.js', 'main.aaaaaaaaaaaaaaaa.js')).toBeFalse();
    expect(isNewBuild('main.aaaaaaaaaaaaaaaa.js', null)).toBeFalse();
    expect(isNewBuild(null, 'main.bbbbbbbbbbbbbbbb.js')).toBeFalse();
  });
});
