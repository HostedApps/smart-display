#!/bin/bash

# Disable screen blanking and power-saving modes
xset s off
xset -dpms
xset s noblank

# Hide the cursor when inactive
unclutter -idle 0.5 -root &

# Clean up crash states to prevent "Restore Pages" warnings
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

# Launch Chromium in Kiosk mode
chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  "https://your-hostinger-domain.com/#/display/YOUR_UNIQUE_DISPLAY_TOKEN"
