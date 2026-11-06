import { Widget } from '../models/display.model';
import { OfflineCacheService } from '../services/offline-cache.service';
import { settleSecretsAfterSave, withoutSecretValues } from './widget-secrets.util';

function widget(id: number, type: string, config: Record<string, any>): Widget {
  return { id, type: type as any, position: { x: 0, y: 0, width: 100, height: 100 }, config } as Widget;
}

describe('Widget secrets (editor & screen)', () => {
  it('keeps typed secrets out of local drafts', () => {
    const payload = { widgets: [widget(1, 'homeassistant', { haUrl: 'http://ha.local', token: 'abc' }), widget(2, 'clock', { format: 'HH:mm' })] };
    const draft = withoutSecretValues(payload);
    expect(draft.widgets[0].config['token']).toBeUndefined();
    expect(draft.widgets[0].config['haUrl']).toBe('http://ha.local');
    expect(draft.widgets[1].config).toEqual({ format: 'HH:mm' });
    expect(payload.widgets[0].config['token']).toBe('abc'); // original untouched
  });

  it('after a save, drops typed values and marks them saved', () => {
    const widgets = [
      widget(7, 'ai_briefing', { apiKey: 'key-123', userName: 'Sam' }),
      widget(8, 'rest_fetch', { authHeader: '', _secretsSet: ['authHeader'], _clearSecrets: ['authHeader'] })
    ];
    settleSecretsAfterSave(widgets);
    expect(widgets[0].config['apiKey']).toBe('');
    expect(widgets[0].config['_secretsSet']).toEqual(['apiKey']);
    expect(widgets[0].config['_widgetId']).toBe(7);
    expect(widgets[1].config['_secretsSet']).toEqual([]);
    expect(widgets[1].config['_clearSecrets']).toBeUndefined();
  });

  it('never writes the secrets a screen received to its offline cache', () => {
    const data = {
      success: true,
      display: {} as any,
      widgets: [widget(3, 'homeassistant', { haUrl: 'http://ha.local', token: 'live-token', _deviceSecrets: ['token'], _secretsSet: ['token'] })]
    };
    const cached = OfflineCacheService.withoutSecrets(data);
    expect(cached.widgets[0].config['token']).toBeUndefined();
    expect(cached.widgets[0].config['_deviceSecrets']).toBeUndefined();
    expect(cached.widgets[0].config['haUrl']).toBe('http://ha.local');
    expect(data.widgets[0].config['token']).toBe('live-token'); // the running screen keeps it
  });
});
