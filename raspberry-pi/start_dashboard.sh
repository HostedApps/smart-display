#!/bin/bash

# Disable screen blanking & power saving
export DISPLAY=:0
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Hide mouse cursor when inactive
if command -v unclutter &>/dev/null; then
  unclutter -idle 0.5 -root &
fi

# Auto-clean crash states to prevent "Restore Pages" warnings
for pref in ~/.config/chromium/Default/Preferences ~/.config/chromium/Default/Preferences~; do
  if [ -f "$pref" ]; then
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$pref" 2>/dev/null || true
    sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$pref" 2>/dev/null || true
  fi
done

# Detect Chromium binary name across OS versions
BROWSER="chromium-browser"
if ! command -v chromium-browser &> /dev/null; then
  BROWSER="chromium"
fi

# Launch Chromium in dedicated fullscreen Kiosk mode
$BROWSER \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  "https://palevioletred-ibex-451966.hostingersite.com/#/display/living-room-display"
