/**
 * Kiosks run for weeks without anyone reloading them, so after a deploy they would keep the old
 * build. Production bundles are content-hashed (main.<hash>.js) and index.html is never cached,
 * so comparing the main bundle named in the served index.html with the one this page loaded
 * tells a screen that a new build is out.
 */

const MAIN_BUNDLE = /(?:^|["'\/])(main\.[0-9a-f]{8,}\.js)["']/i;

/** The hashed main bundle an index.html loads, or null (dev builds, error pages, anything else) */
export function mainBundleIn(html: string): string | null {
  const m = typeof html === 'string' ? html.match(MAIN_BUNDLE) : null;
  return m ? m[1] : null;
}

/** The hashed main bundle this page is running, or null when it isn't a production build */
export function runningMainBundle(doc: Document = document): string | null {
  for (const s of Array.from(doc.querySelectorAll('script[src]'))) {
    const name = (s.getAttribute('src') || '').split('/').pop()!.split('?')[0];
    if (/^main\.[0-9a-f]{8,}\.js$/i.test(name)) return name;
  }
  return null;
}

/** Reload only for a real, different production bundle — never for an unreadable response */
export function isNewBuild(running: string | null, served: string | null): boolean {
  return !!running && !!served && running !== served;
}
