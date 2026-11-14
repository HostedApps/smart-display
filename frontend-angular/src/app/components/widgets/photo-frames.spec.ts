import { PHOTO_FRAME_OPTIONS, PHOTO_FRAMES, photoFrame } from './photo-frames';
import { PhotoFrameComponent } from './photo-frame.component';

describe('Photo widget festive frames', () => {
  it('offers None first, then every frame in the registry', () => {
    expect(PHOTO_FRAME_OPTIONS[0].value).toBe('none');
    expect(PHOTO_FRAME_OPTIONS.map(o => o.value).slice(1)).toEqual(PHOTO_FRAMES.map(f => f.id));
    expect(PHOTO_FRAMES.some(f => f.id === 'diwali')).toBeTrue();
  });

  it('has unique ids and usable CSS images for every layer', () => {
    expect(new Set(PHOTO_FRAMES.map(f => f.id)).size).toBe(PHOTO_FRAMES.length);
    for (const f of PHOTO_FRAMES) {
      const images = [f.band, f.toran, ...(f.ornaments || []).map(o => o.image)].filter(Boolean) as string[];
      for (const img of images) {
        expect(img).toMatch(/^url\("data:image\/svg\+xml;charset=utf-8,%3Csvg[^"]*"\)$/);
      }
    }
  });

  it('no frame for none, unset, or a theme that no longer exists', () => {
    expect(photoFrame('none')).toBeNull();
    expect(photoFrame(undefined)).toBeNull();
    expect(photoFrame('')).toBeNull();
    expect(photoFrame('removed-festival')).toBeNull();
    expect(photoFrame('diwali')?.ornaments?.length).toBe(2);
  });

  it('the overlay component resolves its theme on change', () => {
    const c = new PhotoFrameComponent();
    c.theme = 'diwali';
    c.ngOnChanges();
    expect(c.frame?.id).toBe('diwali');
    c.theme = 'none';
    c.ngOnChanges();
    expect(c.frame).toBeNull();
  });
});
