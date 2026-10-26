import { Widget } from '../models/display.model';

/**
 * Widget config fields that hold secrets. Must match WIDGET_SECRET_FIELDS in
 * backend-api/widget_secrets_lib.php, which stores them encrypted outside the config.
 */
export const WIDGET_SECRET_FIELDS: Readonly<Record<string, readonly string[]>> = {
  ai_briefing: ['apiKey'],
  weather: ['apiKey'],
  homeassistant: ['token'],
  rest_fetch: ['authHeader'],
};

/** Copy of a save payload with typed secret values removed (for local drafts in browser storage). */
export function withoutSecretValues<T extends { widgets?: Widget[] }>(payload: T): T {
  return {
    ...payload,
    widgets: (payload.widgets || []).map(w => {
      const fields = WIDGET_SECRET_FIELDS[w.type];
      if (!fields || !w.config) return w;
      const config = { ...w.config };
      for (const f of fields) delete config[f];
      return { ...w, config };
    })
  };
}

/**
 * After a save where the server stored the secrets: the editor no longer holds typed values,
 * shows them as saved, and knows each widget's database id (so previews use the stored secret).
 */
export function settleSecretsAfterSave(widgets: Widget[]): void {
  for (const w of widgets) {
    const fields = WIDGET_SECRET_FIELDS[w.type];
    if (!fields || !w.config) continue;
    const config = w.config;
    const saved = new Set<string>(Array.isArray(config['_secretsSet']) ? config['_secretsSet'] : []);
    for (const f of fields) {
      if (typeof config[f] === 'string' && config[f].trim() !== '') saved.add(f);
      config[f] = '';
    }
    for (const f of Array.isArray(config['_clearSecrets']) ? config['_clearSecrets'] : []) saved.delete(f);
    delete config['_clearSecrets'];
    config['_secretsSet'] = [...saved];
    if (w.id > 0) config['_widgetId'] = w.id;
  }
}
