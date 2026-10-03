# Smart Display: Multi-Platform Client & Hardware Installation Guide

This guide provides step-by-step instructions to set up and deploy **Smart Display** client kiosks across multiple physical hardware platforms:
- **Raspberry Pi 3 / 4 / 5** (Raspberry Pi OS - Bookworm / Bullseye)
- **Amazon Fire TV & Fire TV Stick** (Fire OS)
- **Apple iPad & iOS Devices** (iPadOS / iOS)
- **Android Tablets & Wall Panels** (Android 9+)
- **Windows Mini PCs / Intel NUC** (Windows 10/11)

---

## 1. System Architecture & Endpoints

Smart Display runs as a high-performance, web-native Progressive Web App (PWA) with responsive visual scaling:
* **Admin Fleet Dashboard**: `https://smart-kiosk.online/#/admin/displays`
* **Hardware PIN Pairing Screen**: `https://smart-kiosk.online/#/pair`
* **Direct Kiosk Wall Display**: `https://smart-kiosk.online/#/display/:token`
* **Mobile "WallDrop" Note & Photo Beam**: `https://smart-kiosk.online/#/drop/:token`

---

## 2. Zero-Friction PIN Commissioning

1. Launch your client browser on the physical TV, iPad, or Raspberry Pi and open `https://smart-kiosk.online/#/pair`.
2. The screen will display a large 6-character pairing code (two letters and four digits, e.g. `UP-5610`).
3. From your phone or admin laptop, open **Fleet Hub** (`/#/admin/displays`) ➔ Click **"Pair Screen with PIN"**.
4. Enter the code and choose which screen configuration to bind to.
5. The device will automatically connect, store a hardware secret, and load the dashboard.

---

## 3. Raspberry Pi 3 / 4 / 5 Deployment Guide

### 3.1: Resolution Detection & Screen Setup
Detect your active monitor resolution:
```bash
cat /sys/class/drm/card*-HDMI-A-1/mode
# Or check framebuffer:
fbset -s
```

In `/boot/firmware/config.txt` (or `/boot/config.txt` on older OS), ensure HDMI audio is enabled:
```ini
# Force HDMI audio output
hdmi_drive=2
```

### 3.2: Disable Screen Blanking & Sleep
```bash
# Disable DPMS and screen saver (X11)
xset s off
xset -dpms
xset s noblank
```
*Or via Desktop GUI:* **Menu ➔ Preferences ➔ Raspberry Pi Configuration ➔ Display ➔ Screen Blanking: OFF**.

### 3.3: Configure Fullscreen Kiosk Autostart
**Recommended:** use the bundled kiosk script, which waits for the network before launching, clears Chromium's crash-restore prompts and restarts Chromium if it exits. See [`raspberry-pi/README_SETUP.md`](../raspberry-pi/README_SETUP.md).

**Minimal alternative:** create `~/.config/autostart/smartdisplay.desktop`:
```ini
[Desktop Entry]
Type=Application
Name=Smart Display Kiosk
Exec=chromium-browser --password-store=basic --ignore-certificate-errors --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --disable-pinch --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required https://smart-kiosk.online/#/display/YOUR_TOKEN
X-GNOME-Autostart-enabled=true
```
Don't add `--incognito`: a paired kiosk keeps its device token in browser storage, and incognito mode erases it on every restart.

### 3.4: Audio Volume Management
```bash
# For PipeWire (Raspberry Pi OS Bookworm):
wpctl set-volume @DEFAULT_AUDIO_SINK@ 100%

# For ALSA (Raspberry Pi OS Bullseye):
amixer set Master 100%
```

---

## 4. Amazon Fire TV & Fire TV Stick

### Method A: Amazon Silk Browser (Zero Sideloading)
1. Install **Amazon Silk Web Browser** from the Amazon Appstore.
2. Open Silk and navigate to `https://smart-kiosk.online/#/pair`.
3. Press the **Menu Button (☰)** on your Alexa Remote ➔ Select **"Fullscreen Mode"**.
4. Bookmark the URL for quick access.

### Method B: Fully Kiosk Browser APK (24/7 Dedicated Mode)
1. Install the free **Downloader** app from the Amazon Appstore.
2. Open Downloader and enter short code **356512** (or download Fully Kiosk Fire OS APK).
3. Open Fully Kiosk Browser ➔ Set **Start URL** to your display link.
4. Enable **"Start on Boot"** and **"Keep Screen On"**.

---

## 5. Apple iPad (Dedicated Wall Kiosk)

### 5.1: Install as Fullscreen PWA
1. Open **Safari** on your iPad and go to your display URL.
2. Tap the **Share Button** ➔ Select **"Add to Home Screen"**.
3. Tap **Add** and launch from the Home Screen (runs in standalone chromeless window mode).

### 5.2: Lock with iOS Guided Access
1. Open iPad **Settings ➔ Accessibility ➔ Guided Access**.
2. Turn **Guided Access: ON** and set a passcode.
3. Set **Display Auto-Lock** to **"Never"**.
4. Open the Smart Display PWA and **Triple-click the Top/Home button** ➔ Tap **Start**.

---

## 6. Android Tablets & Wall Displays

1. Open **Google Chrome** on the Android tablet and go to your display URL.
2. Tap **Menu (⋮)** ➔ **"Add to Home screen"** / **"Install app"**.
3. Enable **App Pinning** (Settings ➔ Security ➔ Advanced ➔ App Pinning) to lock the screen.
4. For automated camera-based motion wake-up and 24/7 lock-task mode, install **Fully Kiosk Browser** from Google Play.

---

## 7. Windows Mini PCs / Intel NUC

1. Press `Win + R` ➔ Type `shell:startup` ➔ Press Enter.
2. Create a shortcut with the following Target:
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required https://smart-kiosk.online/#/display/YOUR_TOKEN
```

---

## 8. Diagnostic Quick Reference

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Offline Mode Badge** | Network dropped or server unreachable | The last saved layout is shown from the offline cache; the screen retries automatically every few seconds and shows the reason (e.g. *Network or DNS Unreachable*). |
| **No audio on alert** | Autoplay policy block | Launch with `--autoplay-policy=no-user-gesture-required`. |
| **Screen edges clipped on TV** | HDMI Overscan active | Change TV picture setting to "Just Scan" / "1:1", or set **TV safe area** in the editor's display Settings. |
| **Layout letterboxed or cropped** | Screen aspect ratio differs from the design canvas | Change **Fit Layout to Screen** (Fit / Fill / Stretch) in display Settings, or pick a matching canvas size. |
| **Kiosk shows the pairing screen** | Device was never paired, or its browser storage was cleared | Pair again from the Fleet Hub. A paired kiosk keeps retrying on errors and does not unpair itself. |
| **Screen turns black** | Power saver / DPMS | Disable OS screen blanking / set sleep to Never. |
