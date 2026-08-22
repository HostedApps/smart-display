# Raspberry Pi Automated Sleep & Wake Schedule Setup

You can schedule your screen to turn off at night (e.g. 11:00 PM) and wake up in the morning (e.g. 6:30 AM) to save power and prevent monitor burn-in.

### 1. Make the power script executable
```bash
chmod +x /home/pi/smart-display/raspberry-pi/display_power.sh
```

### 2. Configure Crontab Schedule
Run:
```bash
crontab -e
```

Add the following lines at the bottom of the crontab:
```cron
# Turn display ON every morning at 6:30 AM (Monday - Sunday)
30 6 * * * /home/pi/smart-display/raspberry-pi/display_power.sh on > /tmp/display_power.log 2>&1

# Turn display OFF every night at 11:00 PM (Monday - Sunday)
0 23 * * * /home/pi/smart-display/raspberry-pi/display_power.sh off > /tmp/display_power.log 2>&1
```

### 3. Web UI Sleep Dimming
In addition to hardware sleep, your Smart Display also supports **Software Night Mode**:
- Configurable in the **Display Settings** panel in the Dashboard Editor.
- When Night Mode is enabled, the display dims to an ambient OLED red/amber night clock without needing external hardware commands.
