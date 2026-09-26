import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SevereWeatherAlertBannerComponent, SevereWeatherAlertData } from './severe-weather-alert-banner.component';

describe('SevereWeatherAlertBannerComponent', () => {
  let component: SevereWeatherAlertBannerComponent;
  let fixture: ComponentFixture<SevereWeatherAlertBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SevereWeatherAlertBannerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SevereWeatherAlertBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create severe weather alert banner', () => {
    expect(component).toBeTruthy();
  });

  it('should not render anything if alert is null', () => {
    component.alert = null;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.severe-alert-bar')).toBeNull();
  });

  it('should render alert details and severity badge when alert is set', () => {
    component.alert = {
      title: 'Tornado Warning',
      message: 'Take shelter immediately in a basement or interior room.',
      severity: 'emergency',
      city: 'San Jose, CA'
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.severe-alert-bar')).toBeTruthy();
    expect(compiled.querySelector('.alert-title')?.textContent).toContain('Tornado Warning');
    expect(compiled.querySelector('.alert-desc')?.textContent).toContain('Take shelter immediately');
    expect(compiled.querySelector('.alert-pill')?.textContent).toContain('EMERGENCY');
  });

  it('should choose appropriate weather icon based on alert keywords', () => {
    const tornadoAlert: SevereWeatherAlertData = { title: 'Tornado Watch', message: 'Conditions favorable' };
    expect(component.getAlertIcon(tornadoAlert)).toBe('🌪️');

    const floodAlert: SevereWeatherAlertData = { title: 'Flash Flood Warning', message: 'Rapid rise in water' };
    expect(component.getAlertIcon(floodAlert)).toBe('🌊');

    const blizzardAlert: SevereWeatherAlertData = { title: 'Blizzard Warning', message: 'Heavy snow and zero visibility' };
    expect(component.getAlertIcon(blizzardAlert)).toBe('❄️');

    const thunderAlert: SevereWeatherAlertData = { title: 'Thunderstorm Watch', message: 'Lightning and heavy rain' };
    expect(component.getAlertIcon(thunderAlert)).toBe('⚡');

    const genericAlert: SevereWeatherAlertData = { title: 'High Wind Advisory', message: 'Gusts up to 45 mph' };
    expect(component.getAlertIcon(genericAlert)).toBe('💨');
  });

  it('should emit dismissed event when close button is clicked', () => {
    let dismissedCalled = false;
    component.dismissed.subscribe(() => {
      dismissedCalled = true;
    });

    component.alert = { title: 'Wind Advisory', message: 'Windy conditions' };
    component.dismissable = true;
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.btn-alert-dismiss') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();

    expect(dismissedCalled).toBeTrue();
  });
});
