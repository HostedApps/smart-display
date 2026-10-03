# Raspberry Pi Automated Sleep & Wake Schedule Setup

You can schedule your screen to turn off at night (e.g. 11:00 PM) and wake up in the morning (e.g. 6:30 AM) to save power and prevent monitor burn-in.

### 1. Copy the power script and make it executable
Copy [`display_power.sh`](./display_power.sh) to `/home/pi/display_power.sh` (the same location used in [`README_SETUP.md`](./README_SETUP.md)), then:
```bash
chmod +x /home/pi/display_power.sh
```

### 2. Configure Crontab Schedule
Run:
```bash
crontab -e
```

Add the following lines at the bottom of the crontab:
```cron
# Turn display ON every morning at 6:30 AM (Monday - Sunday)
30 6 * * * /home/pi/display_power.sh on > /tmp/display_power.log 2>&1

# Turn display OFF every night at 11:00 PM (Monday - Sunday)
0 23 * * * /home/pi/display_power.sh off > /tmp/display_power.log 2>&1
```

### 3. Web UI Sleep Dimming
In addition to hardware sleep, your Smart Display also supports **Software Night Mode**:
- Configure the **Sleep schedule** in the editor's display **Settings**. Screens can also be put to sleep or woken remotely from the Fleet Hub (single display or bulk).
- When Night Mode is enabled, the display dims to an ambient OLED red/amber night clock without needing external hardware commands.
