import { Component, Input, Type } from '@angular/core';
import { Widget, WidgetType } from '../../../models/display.model';
import { getWidgetDefinition } from '../../widgets/widget-registry';
import { ConfigField } from '../../widgets/widget-config-schema';
import { WidgetFormBase } from './widget-form-base';
import { AiBriefingFormComponent } from './ai-briefing-form.component';
import { CalendarFormComponent } from './calendar-form.component';
import { CustomWidgetFormComponent } from './custom-widget-form.component';
import { HomeAssistantFormComponent } from './homeassistant-form.component';
import { MealPlannerFormComponent } from './meal-planner-form.component';
import { PhotoFormComponent } from './photo-form.component';
import { StickyNotesFormComponent } from './sticky-notes-form.component';
import { StocksFormComponent } from './stocks-form.component';
import { TextFormComponent } from './text-form.component';

/** Widgets whose settings need more than plain fields (list editors, actions). */
export const CUSTOM_WIDGET_FORMS: Partial<Record<WidgetType, Type<WidgetFormBase>>> = {
  ai_briefing: AiBriefingFormComponent,
  calendar: CalendarFormComponent,
  custom: CustomWidgetFormComponent,
  homeassistant: HomeAssistantFormComponent,
  meal_planner: MealPlannerFormComponent,
  photo: PhotoFormComponent,
  sticky_note: StickyNotesFormComponent,
  stock_crypto: StocksFormComponent,
  text: TextFormComponent,
};

export function hasWidgetContentSettings(type: string): boolean {
  return !!CUSTOM_WIDGET_FORMS[type as WidgetType] || !!getWidgetDefinition(type)?.fields?.length;
}

/**
 * The inspector's Content tab for one widget: its custom form if it has one, otherwise the form
 * generated from its schema in the registry.
 */
@Component({
  selector: 'app-widget-content-form',
  template: `
    <ng-container *ngIf="customForm as form; else generated">
      <ng-container *ngComponentOutlet="form; inputs: { widget: widget, displayToken: displayToken, changed: changed }"></ng-container>
    </ng-container>
    <ng-template #generated>
      <app-widget-config-form *ngIf="fields?.length; else none" [config]="widget.config" [fields]="fields!"
                              [displayToken]="displayToken" [widgetId]="widget.id"></app-widget-config-form>
      <ng-template #none>
        <p class="field-hint">This widget has no content settings. Use the Style tab to change how it looks.</p>
      </ng-template>
    </ng-template>
  `,
  styleUrls: ['./widget-forms.css']
})
export class WidgetContentFormComponent {
  @Input({ required: true }) widget!: Widget;
  @Input() displayToken = '';
  /** Called after structural edits so the editor records an undo step */
  @Input() changed: () => void = () => {};

  get customForm(): Type<WidgetFormBase> | null {
    return CUSTOM_WIDGET_FORMS[this.widget.type] ?? null;
  }

  get fields(): readonly ConfigField[] | undefined {
    return getWidgetDefinition(this.widget.type)?.fields;
  }
}
