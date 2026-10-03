# Raspberry Pi Kiosk Setup Guide

This guide explains how to set up your Raspberry Pi to automatically boot directly into your Smart Display in full-screen kiosk mode with mouse hiding and scheduled HDMI standby.

---

## 🛠️ Step 1: Install Required Utilities on Raspberry Pi
Open a terminal on your Raspberry Pi (or SSH in) and install Chromium, unclutter (to hide cursor), and x11 tools:

```bash
sudo apt update
sudo apt install -y chromium-browser unclutter x11-xserver-utils
```
*(On Raspberry Pi OS Bookworm, if `chromium-browser` is not found, install `chromium` instead: `sudo apt install -y chromium`)*

---

## 🚀 Step 2: Copy the Kiosk Script
Create the startup script on your Raspberry Pi:

```bash
nano /home/pi/start_dashboard.sh
```

Paste the contents of [`start_dashboard.sh`](./start_dashboard.sh) and save (`Ctrl+O`, `Enter`, `Ctrl+X`).

**Set your display link:** edit the `TARGET_URL` line near the top of the script so it points at your display (copy it from the Fleet Hub card menu → *Copy kiosk link*), for example:
```bash
TARGET_URL="https://smart-kiosk.online/#/display/YOUR_TOKEN"
```
It ships with a placeholder token. To use PIN pairing, set it to `https://smart-kiosk.online/#/pair` for the first boot only: once paired, the screen loads its display automatically and stores its device token. Then change `TARGET_URL` to the display link, because the pairing page requests a new code every time it opens.

The script also waits up to 45 s for the network on boot, clears Chromium's crash-restore state, and relaunches Chromium if it exits.

Make the script executable:
```bash
chmod +x /home/pi/start_dashboard.sh
```

---

## 🔄 Step 3: Enable Auto-Start on Boot
To make the display open automatically whenever the Raspberry Pi powers on:

```bash
mkdir -p /home/pi/.config/autostart
nano /home/pi/.config/autostart/smart-display.desktop
```

Paste this desktop entry (also provided as [`smart-display.desktop`](./smart-display.desktop)):
```ini
[Desktop Entry]
Type=Application
Name=Smart Display Kiosk
Exec=/home/pi/start_dashboard.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 🌙 Step 4: (Optional) Night Standby Schedule via Cron
To turn off your HDMI monitor at 11:00 PM and turn it back on at 6:30 AM every day ([`display_power.sh`](./display_power.sh) tries HDMI-CEC, X11 DPMS, `vcgencmd` and `wlr-randr`, so it works with TVs and monitors on both X11 and Wayland). For TV power control over HDMI-CEC, install `cec-utils` (`sudo apt install -y cec-utils`).

1. Copy `display_power.sh` to `/home/pi/display_power.sh` and make executable:
   ```bash
   chmod +x /home/pi/display_power.sh
   ```

2. Open the user crontab:
   ```bash
   crontab -e
   ```

3. Add these two scheduled entries:
   ```cron
   # Turn display OFF at 11:00 PM every night
   0 23 * * * /home/pi/display_power.sh off >/dev/null 2>&1

   # Turn display ON at 6:30 AM every morning
   30 6 * * * /home/pi/display_power.sh on >/dev/null 2>&1
   ```

---

## 🧪 Testing Immediately:
To launch the kiosk right now on your Pi desktop screen:
```bash
/home/pi/start_dashboard.sh
```
*(To exit kiosk mode, press `Alt + F4` or `Ctrl + W` on a keyboard connected to the Pi).*
