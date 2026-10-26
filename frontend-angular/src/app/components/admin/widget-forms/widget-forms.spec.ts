import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { WIDGET_TYPES, Widget } from '../../../models/display.model';
import { WIDGET_REGISTRY } from '../../widgets/widget-registry';
import { ConfigField } from '../../widgets/widget-config-schema';
import { WidgetConfigFormComponent } from './widget-config-form.component';
import { CUSTOM_WIDGET_FORMS, hasWidgetContentSettings } from './widget-content-form.component';
import { CalendarFormComponent } from './calendar-form.component';
import { StocksFormComponent } from './stocks-form.component';

describe('Widget settings forms', () => {
  it('every widget keeps the settings form it had before the split', () => {
    // The editor's former hard-coded list of widgets with a Content form
    const before = ['custom', 'greeting', 'ai_briefing', 'analog_clock', 'button', 'calendar', 'camera_pip', 'chores', 'clock', 'commute',
      'countdown', 'gauge', 'gmail', 'google_maps', 'homeassistant', 'meal_planner', 'photo', 'qrcode', 'quote', 'radar', 'reddit',
      'rest_fetch', 'rss', 'scheduled_text', 'shapes', 'slack', 'spotify', 'sticky_note', 'stock_crypto', 'sun_moon', 'text', 'todo',
      'tradingview', 'weather', 'whiteboard', 'youtube'];
    for (const type of WIDGET_TYPES) {
      expect(hasWidgetContentSettings(type)).withContext(type).toBe(before.includes(type));
    }
  });

  it('no widget has both a generated and a custom form', () => {
    for (const def of WIDGET_REGISTRY) {
      expect(!!def.fields && !!CUSTOM_WIDGET_FORMS[def.type]).withContext(def.type).toBeFalse();
    }
  });

  it('schema fields have unique keys per widget, and selects have options', () => {
    for (const def of WIDGET_REGISTRY) {
      const keys = (def.fields || []).filter(f => 'key' in f).map(f => (f as { key: string }).key);
      expect(new Set(keys).size).withContext(def.type).toBe(keys.length);
      for (const f of def.fields || []) {
        if (f.type === 'select') expect(f.options?.length).withContext(`${def.type}.${f.key}`).toBeGreaterThan(0);
      }
    }
  });

  describe('generated form', () => {
    let fixture: ComponentFixture<WidgetConfigFormComponent>;
    let form: WidgetConfigFormComponent;

    function render(fields: ConfigField[], config: Record<string, any>): HTMLElement {
      form.fields = fields;
      form.config = config;
      form.ngOnChanges();
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [WidgetConfigFormComponent],
        imports: [FormsModule],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      fixture = TestBed.createComponent(WidgetConfigFormComponent);
      form = fixture.componentInstance;
    });

    it('edits text, number and select settings in the widget config', fakeAsync(() => {
      const config: Record<string, any> = { city: 'Paris', units: 'metric' };
      const el = render([
        { type: 'text', key: 'city', label: 'City' },
        { type: 'number', key: 'zoom', label: 'Zoom' },
        { type: 'select', key: 'units', label: 'Units', options: [{ value: 'imperial', label: 'F' }, { value: 'metric', label: 'C' }] },
      ], config);
      tick();
      const text = el.querySelector('input[type=text]') as HTMLInputElement;
      text.value = 'Tokyo';
      text.dispatchEvent(new Event('input'));
      const num = el.querySelector('input[type=number]') as HTMLInputElement;
      num.value = '7';
      num.dispatchEvent(new Event('input'));
      expect(config['city']).toBe('Tokyo');
      expect(config['zoom']).toBe(7);
      expect(el.querySelectorAll('label')[0].textContent).toContain('City');
    }));

    it('shows conditional fields only when their condition holds', () => {
      const config: Record<string, any> = { category: 'wisdom' };
      const fields: ConfigField[] = [{ type: 'text', key: 'customQuote', label: 'Custom Quote', showIf: c => c['category'] === 'custom' }];
      expect(render(fields, config).textContent).not.toContain('Custom Quote');
      config['category'] = 'custom';
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Custom Quote');
    });

    it('treats an unset "default on" toggle as on', fakeAsync(() => {
      const el = render([{ type: 'toggle', key: 'showSubline', label: 'Subline', defaultOn: true }], {});
      tick();
      fixture.detectChanges();
      expect((el.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBeTrue();
    }));

    it('lays out fields with the same row side by side', () => {
      const el = render([
        { type: 'number', key: 'lat', label: 'Lat', row: 'c' },
        { type: 'number', key: 'lon', label: 'Lon', row: 'c' },
        { type: 'text', key: 'name', label: 'Name' },
      ], {});
      const rows = el.querySelectorAll('.form-row');
      expect(rows.length).toBe(1);
      expect(rows[0].querySelectorAll('input').length).toBe(2);
    });

    it('applies a preset to several settings at once', () => {
      const config: Record<string, any> = {};
      const el = render([{ type: 'preset', label: 'City', placeholder: 'Choose', presets: [{ label: 'Paris', values: { cityName: 'Paris', lat: 48.86, lon: 2.35 } }] }], config);
      const select = el.querySelector('select') as HTMLSelectElement;
      select.value = '0';
      select.dispatchEvent(new Event('change'));
      expect(config).toEqual({ cityName: 'Paris', lat: 48.86, lon: 2.35 });
      expect(select.value).toBe('');
    });

    it('edits a list setting as comma-separated text', fakeAsync(() => {
      const config: Record<string, any> = { showDays: ['Mon', 'Tue'] };
      const el = render([{ type: 'list', key: 'showDays', label: 'Days' }], config);
      tick();
      fixture.detectChanges();
      const input = el.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('Mon,Tue');
      input.value = 'Sat,Sun';
      input.dispatchEvent(new Event('input'));
      expect(config['showDays']).toEqual(['Sat', 'Sun']);
    }));

    it('puts sectioned fields in a collapsible block', () => {
      const el = render([
        { type: 'text', key: 'city', label: 'City' },
        { type: 'secret', key: 'apiKey', label: 'Key', section: 'Advanced' },
      ], {});
      const details = el.querySelector('details');
      expect(details?.querySelector('summary')?.textContent).toContain('Advanced');
      expect(details?.querySelector('app-secret-input')).toBeTruthy();
    });
  });

  describe('custom forms', () => {
    function widget(type: string, config: Record<string, any>): Widget {
      return { id: 5, type: type as any, position: { x: 0, y: 0, width: 100, height: 100 }, config } as Widget;
    }

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [CalendarFormComponent, StocksFormComponent],
        imports: [FormsModule, HttpClientTestingModule],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
    });

    it('calendar: adding and removing a feed records an undo step', () => {
      const fixture = TestBed.createComponent(CalendarFormComponent);
      const changed = jasmine.createSpy('changed');
      fixture.componentInstance.widget = widget('calendar', {});
      fixture.componentInstance.changed = changed;
      fixture.componentInstance.addFeed();
      expect(fixture.componentInstance.widget.config['feeds'].length).toBe(1);
      fixture.componentInstance.removeFeed(0);
      expect(fixture.componentInstance.widget.config['feeds'].length).toBe(0);
      expect(changed).toHaveBeenCalledTimes(2);
    });

    it('stocks: quick add appends once, from text or array settings', () => {
      const fixture = TestBed.createComponent(StocksFormComponent);
      fixture.componentInstance.widget = widget('stock_crypto', { symbols: 'aapl, msft' });
      fixture.componentInstance.addStock('NVDA');
      fixture.componentInstance.addStock('NVDA');
      expect(fixture.componentInstance.widget.config['symbols']).toEqual(['AAPL', 'MSFT', 'NVDA']);
    });
  });
});
