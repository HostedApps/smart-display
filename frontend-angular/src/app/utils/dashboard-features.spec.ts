import { AVAILABLE_FONTS, getFontFamilyString, loadGoogleFont } from './font-loader.util';
import { DASHBOARD_TEMPLATES } from './dashboard-templates.util';
import { WIDGET_REGISTRY, registryMismatches } from '../components/widgets/widget-registry';

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
    it('should offer 6 distinct curated templates', () => {
      expect(DASHBOARD_TEMPLATES.length).toBe(6);
      const templateIds = DASHBOARD_TEMPLATES.map(t => t.id);
      expect(templateIds).toContain('family_command_center');
      expect(templateIds).toContain('smart_home_ops');
      expect(templateIds).toContain('minimalist_desk_clock');
      expect(templateIds).toContain('executive_finance');
      expect(templateIds).toContain('transit_commute');
      expect(templateIds).toContain('ambient_art_frame');
    });

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
