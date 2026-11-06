import { Directive, Input } from '@angular/core';
import { Widget } from '../../../models/display.model';

/** Inputs every custom widget settings form receives (see widget-content-form.component.ts). */
@Directive()
export abstract class WidgetFormBase {
  @Input({ required: true }) widget!: Widget;
  /** Display token (for webhook instructions) */
  @Input() displayToken = '';
  /** Call after structural edits (adding / removing list items) so the editor records an undo step */
  @Input() changed: () => void = () => {};

  get config(): Record<string, any> {
    return this.widget.config;
  }
}
