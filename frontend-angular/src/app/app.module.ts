import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DisplayViewerComponent } from './components/display-viewer.component';
import { DashboardEditorComponent } from './components/admin/dashboard-editor.component';
import { DisplayListComponent } from './components/admin/display-list.component';
import { DevicePairingComponent } from './components/pairing/device-pairing.component';
import { LoginComponent } from './components/auth/login.component';
import { ClockWidgetComponent } from './components/widgets/clock-widget.component';
import { WeatherWidgetComponent } from './components/widgets/weather-widget.component';
import { CalendarWidgetComponent } from './components/widgets/calendar-widget.component';
import { PhotoWidgetComponent } from './components/widgets/photo-widget.component';
import { RssWidgetComponent } from './components/widgets/rss-widget.component';
import { TodoWidgetComponent } from './components/widgets/todo-widget.component';
import { HomeAssistantWidgetComponent } from './components/widgets/homeassistant-widget.component';
import { SpotifyWidgetComponent } from './components/widgets/spotify-widget.component';
import { StockCryptoWidgetComponent } from './components/widgets/stock-crypto-widget.component';
import { StickyNoteWidgetComponent } from './components/widgets/sticky-note-widget.component';
import { CountdownWidgetComponent } from './components/widgets/countdown-widget.component';
import { MealPlannerWidgetComponent } from './components/widgets/meal-planner-widget.component';
import { RadarWidgetComponent } from './components/widgets/radar-widget.component';
import { QuoteWidgetComponent } from './components/widgets/quote-widget.component';
import { AIBriefingWidgetComponent } from './components/widgets/ai-briefing-widget.component';
import { ChoresWidgetComponent } from './components/widgets/chores-widget.component';
import { CameraPipWidgetComponent } from './components/widgets/camera-pip-widget.component';
import { CommuteWidgetComponent } from './components/widgets/commute-widget.component';
import { YoutubeWidgetComponent } from './components/widgets/youtube-widget.component';
import { TextWidgetComponent } from './components/widgets/text-widget.component';
import { QrcodeWidgetComponent } from './components/widgets/qrcode-widget.component';
import { WorldClocksWidgetComponent } from './components/widgets/world-clocks-widget.component';
import { ShapesWidgetComponent } from './components/widgets/shapes-widget.component';
import { ScheduledTextWidgetComponent } from './components/widgets/scheduled-text-widget.component';
import { ButtonWidgetComponent } from './components/widgets/button-widget.component';
import { SunMoonWidgetComponent } from './components/widgets/sun-moon-widget.component';
import { AnalogClockWidgetComponent } from './components/widgets/analog-clock-widget.component';
import { RestFetchWidgetComponent } from './components/widgets/rest-fetch-widget.component';
import { GaugeWidgetComponent } from './components/widgets/gauge-widget.component';
import { SevereWeatherAlertBannerComponent } from './components/widgets/severe-weather-alert-banner.component';
import { WhiteboardWidgetComponent } from './components/widgets/whiteboard-widget.component';
import { GoogleMapsWidgetComponent } from './components/widgets/google-maps-widget.component';
import { SlackWidgetComponent } from './components/widgets/slack-widget.component';
import { GmailWidgetComponent } from './components/widgets/gmail-widget.component';
import { TradingviewWidgetComponent } from './components/widgets/tradingview-widget.component';
import { RedditWidgetComponent } from './components/widgets/reddit-widget.component';
import { TouchhubDockComponent } from './components/widgets/touchhub-dock.component';
import { WallDropComponent } from './components/walldrop/wall-drop.component';
import { InstallationGuideComponent } from './components/help/installation-guide.component';
import { SuperAdminComponent } from './components/admin/super-admin.component';
import { HelpDocsModalComponent } from './components/help/help-docs-modal.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    DisplayViewerComponent,
    DashboardEditorComponent,
    DisplayListComponent,
    SuperAdminComponent,
    DevicePairingComponent,
    LoginComponent,
    ClockWidgetComponent,
    WeatherWidgetComponent,
    CalendarWidgetComponent,
    PhotoWidgetComponent,
    RssWidgetComponent,
    TodoWidgetComponent,
    HomeAssistantWidgetComponent,
    SpotifyWidgetComponent,
    StockCryptoWidgetComponent,
    StickyNoteWidgetComponent,
    CountdownWidgetComponent,
    MealPlannerWidgetComponent,
    RadarWidgetComponent,
    QuoteWidgetComponent,
    AIBriefingWidgetComponent,
    ChoresWidgetComponent,
    CameraPipWidgetComponent,
    CommuteWidgetComponent,
    YoutubeWidgetComponent,
    TextWidgetComponent,
    QrcodeWidgetComponent,
    WorldClocksWidgetComponent,
    ShapesWidgetComponent,
    ScheduledTextWidgetComponent,
    ButtonWidgetComponent,
    SunMoonWidgetComponent,
    AnalogClockWidgetComponent,
    RestFetchWidgetComponent,
    GaugeWidgetComponent,
    SevereWeatherAlertBannerComponent,
    WhiteboardWidgetComponent,
    GoogleMapsWidgetComponent,
    SlackWidgetComponent,
    GmailWidgetComponent,
    TradingviewWidgetComponent,
    RedditWidgetComponent,
    TouchhubDockComponent,
    WallDropComponent,
    InstallationGuideComponent,
    HelpDocsModalComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
