import { AVAILABLE_FONTS, getFontFamilyString, loadGoogleFont } from './font-loader.util';
import { DASHBOARD_TEMPLATES } from './dashboard-templates.util';
import { WIDGET_REGISTRY, registryMismatches } from '../components/widgets/widget-registry';
import { THEME_PRESETS } from './theme.util';

describe('Phase 2C Features: Typography & Starter Templates', () => {
  describe('Font Loader & Typography', () => {
    it('should have a comprehensive catalog of Google Fonts', () => {
      expect(AVAILABLE_FONTS.length).toBeGreaterThanOrEqual(10);
      const fontIds = AVAILABLE_FONTS.map(f => f.id);
      expect(fontIds).toContain('Outfit');
      expect(fontIds).toContain('Inter');
      expect(fontIds).toContain('Space Grotesk');
      expect(fontIds).toContain('Playfair Display');
      expect(fontIds).toContain('Cinzel');
      expect(fontIds).toContain('JetBrains Mono');
    });

    it('should resolve correct CSS font-family strings', () => {
      expect(getFontFamilyString('system')).toContain('-apple-system');
      expect(getFontFamilyString('Outfit')).toContain("'Outfit', sans-serif");
      expect(getFontFamilyString('Playfair Display')).toContain("'Playfair Display', serif");
      expect(getFontFamilyString('JetBrains Mono')).toContain("'JetBrains Mono', monospace");
      expect(getFontFamilyString(undefined)).toContain('-apple-system');
    });

    it('should append a stylesheet link tag when loading a Google font', () => {
      loadGoogleFont('Outfit');
      const linkTag = document.getElementById('gfont-outfit') as HTMLLinkElement;
      expect(linkTag).toBeTruthy();
      expect(linkTag.href).toContain('fonts.googleapis.com');
      expect(linkTag.href).toContain('Outfit');
    });
  });

  describe('Starter Templates Catalog', () => {
    it('should offer 14 distinct curated templates', () => {
      expect(DASHBOARD_TEMPLATES.length).toBe(14);
      const templateIds = DASHBOARD_TEMPLATES.map(t => t.id);
      expect(new Set(templateIds).size).toBe(templateIds.length);
      expect(templateIds).toEqual([
        'family_command_center',
        'smart_home_ops',
        'minimalist_desk_clock',
        'executive_finance',
        'transit_commute',
        'ambient_art_frame',
        'magic_mirror',
        'kitchen_hub',
        'office_lobby',
        'photo_frame',
        'sports_fitness',
        'classroom',
        'night_stand',
        'dev_ops_wall'
      ]);
    });

    it('should only recommend theme presets that exist', () => {
      const presetIds = THEME_PRESETS.map(p => p.id);
      for (const template of DASHBOARD_TEMPLATES) {
        if (template.recommendedTheme) {
          expect(presetIds).toContain(template.recommendedTheme);
        }
      }
      expect(DASHBOARD_TEMPLATES.find(t => t.id === 'magic_mirror')!.recommendedTheme).toBe('mirror');
      expect(DASHBOARD_TEMPLATES.find(t => t.id === 'photo_frame')!.recommendedTheme).toBe('ambient');
    });

    it('should only use registered widget types', () => {
      const registered = WIDGET_REGISTRY.map(d => d.type as string);
      for (const template of DASHBOARD_TEMPLATES) {
        for (const w of template.generateWidgets(1920, 1080)) {
          expect(registered).toContain(w.type as string);
        }
      }
    });

    for (const [cw, ch] of [[1920, 1080], [1080, 1920]]) {
      it(`should lay out every template without overlaps and inside a ${cw}x${ch} canvas`, () => {
        for (const template of DASHBOARD_TEMPLATES) {
          const widgets = template.generateWidgets(cw, ch, 'p');
          const rects = widgets.map(w => w.position!);
          for (const r of rects) {
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.width).toBeGreaterThan(0);
            expect(r.height).toBeGreaterThan(0);
            expect(r.x + r.width).toBeLessThanOrEqual(cw);
            expect(r.y + r.height).toBeLessThanOrEqual(ch);
          }
          // A widget covering the whole canvas is a background layer (e.g. a full-bleed photo) that others overlay on purpose.
          const isBackground = (r: { x: number; y: number; width: number; height: number }) =>
            r.x === 0 && r.y === 0 && r.width === cw && r.height === ch;
          const tol = 1;
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i];
              const b = rects[j];
              if (isBackground(a) || isBackground(b)) continue;
              const overlaps =
                a.x + a.width - tol > b.x && b.x + b.width - tol > a.x &&
                a.y + a.height - tol > b.y && b.y + b.height - tol > a.y;
              expect(overlaps).withContext(`${template.id}: ${widgets[i].customName} overlaps ${widgets[j].customName}`).toBeFalse();
            }
          }
        }
      });
    }

    it('should generate valid proportional widget configurations for 1920x1080 canvas', () => {
      const cw = 1920;
      const ch = 1080;

      for (const template of DASHBOARD_TEMPLATES) {
        const widgets = template.generateWidgets(cw, ch, 'test_page');
        expect(widgets.length).toBeGreaterThan(0);

        for (const w of widgets) {
          expect(w.type).toBeDefined();
          expect(w.position).toBeDefined();
          expect(w.position!.x).toBeGreaterThanOrEqual(0);
          expect(w.position!.y).toBeGreaterThanOrEqual(0);
          expect(w.position!.width).toBeGreaterThan(0);
          expect(w.position!.height).toBeGreaterThan(0);
          expect(w.position!.x + w.position!.width).toBeLessThanOrEqual(cw + 10);
          expect(w.position!.y + w.position!.height).toBeLessThanOrEqual(ch + 10);
          expect(w.page_id).toBe('test_page');
        }
      }
    });

    it('should only assign chores to members the template defines', () => {
      for (const template of DASHBOARD_TEMPLATES) {
        for (const w of template.generateWidgets(1920, 1080).filter(x => x.type === 'chores')) {
          const memberIds = (w.config!['members'] || []).map((m: { id: string }) => m.id);
          expect(memberIds.length).toBeGreaterThan(0);
          for (const chore of w.config!['chores'] || []) {
            expect(memberIds).toContain(chore.memberId);
          }
        }
      }
    });

    it('should use the commute fields the commute widget renders', () => {
      for (const template of DASHBOARD_TEMPLATES) {
        for (const w of template.generateWidgets(1920, 1080).filter(x => x.type === 'commute')) {
          for (const dest of w.config!['destinations'] || []) {
            expect(typeof dest.durationMinutes).toBe('number');
            expect(['fast', 'moderate', 'heavy']).toContain(dest.trafficStatus);
          }
        }
      }
    });

    it('should scale appropriately for 720p portrait canvas', () => {
      const cw = 720;
      const ch = 1280;

      const familyTemplate = DASHBOARD_TEMPLATES.find(t => t.id === 'family_command_center')!;
      const widgets = familyTemplate.generateWidgets(cw, ch, 'portrait_page');

      expect(widgets.length).toBe(5);
      const clock = widgets.find(w => w.type === 'clock')!;
      expect(clock.position!.width).toBeLessThan(cw);
      expect(clock.position!.height).toBeLessThan(ch);
    });
  });
});

describe('Widget Registry', () => {
  it('should register every widget type exactly once', () => {
    expect(registryMismatches()).toEqual([]);
    const types = WIDGET_REGISTRY.map(d => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('should return a fresh default config object for each new widget', () => {
    for (const def of WIDGET_REGISTRY) {
      expect(def.defaultConfig()).not.toBe(def.defaultConfig());
      expect(def.defaultSize.width).toBeGreaterThan(0);
      expect(def.defaultSize.height).toBeGreaterThan(0);
    }
  });
});
