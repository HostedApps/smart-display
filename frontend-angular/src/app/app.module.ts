import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DisplayViewerComponent } from './components/display-viewer.component';
import { DashboardEditorComponent } from './components/admin/dashboard-editor.component';
import { ClockWidgetComponent } from './components/widgets/clock-widget.component';
import { WeatherWidgetComponent } from './components/widgets/weather-widget.component';
import { CalendarWidgetComponent } from './components/widgets/calendar-widget.component';
import { PhotoWidgetComponent } from './components/widgets/photo-widget.component';
import { RssWidgetComponent } from './components/widgets/rss-widget.component';
import { TodoWidgetComponent } from './components/widgets/todo-widget.component';
import { HomeAssistantWidgetComponent } from './components/widgets/homeassistant-widget.component';
import { SpotifyWidgetComponent } from './components/widgets/spotify-widget.component';
import { StockCryptoWidgetComponent } from './components/widgets/stock-crypto-widget.component';

@NgModule({
  declarations: [
    AppComponent,
    DisplayViewerComponent,
    DashboardEditorComponent,
    ClockWidgetComponent,
    WeatherWidgetComponent,
    CalendarWidgetComponent,
    PhotoWidgetComponent,
    RssWidgetComponent,
    TodoWidgetComponent,
    HomeAssistantWidgetComponent,
    SpotifyWidgetComponent,
    StockCryptoWidgetComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
