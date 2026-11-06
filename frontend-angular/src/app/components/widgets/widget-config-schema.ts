/**
 * Schema for a widget's settings form in the editor inspector (Content tab). Widgets list their
 * fields in widget-registry.ts and the editor renders them with <app-widget-config-form>.
 * Widgets whose settings need custom UI (lists of feeds, notes…) use a form component instead
 * (components/admin/widget-forms/custom-widget-forms.ts).
 */
export type WidgetConfig = Record<string, any>;

export interface ConfigOption {
  /** Stored as-is: strings stay strings, numbers stay numbers, `undefined` clears the setting */
  value: string | number | boolean | undefined;
  label: string;
}

interface BaseField {
  /** Shown only when this returns true (e.g. a field that depends on a mode) */
  showIf?: (config: WidgetConfig) => boolean;
  /** Consecutive fields with the same row id are laid out side by side */
  row?: string;
  /** Fields with the same section render together inside a collapsible <details> with this title */
  section?: string;
}

export interface InputField extends BaseField {
  type: 'text' | 'textarea' | 'number' | 'select' | 'toggle' | 'color' | 'date' | 'time' | 'range' | 'secret' | 'list';
  key: string;
  label: string;
  placeholder?: string | ((config: WidgetConfig) => string);
  hint?: string;
  options?: ConfigOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  /** toggle: treat an unset value as on (the widget's own default is "on") */
  defaultOn?: boolean;
  /** range: value shown in the label while the setting is unset */
  defaultValue?: number;
  /** range: unit appended to the value in the label */
  unit?: string;
  /** text: fixed text shown before the input (e.g. "r/") */
  prefix?: string;
  /** list: separator for a list stored as an array but edited as text (default ",") */
  separator?: string;
  /** textarea: monospace, no spell check (code / JSON) */
  code?: boolean;
}

/** Info box (no setting) */
export interface NoticeField extends BaseField {
  type: 'notice';
  text: string;
  /** Bold lead-in */
  title?: string;
  icon?: string;
}

/** A dropdown that fills in several settings at once (city presets, API presets) */
export interface PresetField extends BaseField {
  type: 'preset';
  label: string;
  placeholder: string;
  presets: { label: string; values: WidgetConfig }[];
}

/** HTTP push instructions for this widget (needs the display token and widget id) */
export interface WebhookField extends BaseField {
  type: 'webhook';
  title: string;
  text: string;
}

export type ConfigField = InputField | NoticeField | PresetField | WebhookField;
