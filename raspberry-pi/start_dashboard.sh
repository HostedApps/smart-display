#!/bin/bash

# Disable screen blanking & power saving
export DISPLAY=:0
export WAYLAND_DISPLAY=wayland-0
export XDG_RUNTIME_DIR=/run/user/$(id -u)

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

# Wait for network & target server to be reachable before launching Chromium
# Prevents ERR_NAME_NOT_RESOLVED or blank white screen on cold boot
TARGET_URL="https://smart-kiosk.online/#/display/living-room-display"
HEALTH_URL="https://smart-kiosk.online/"

echo "[Smart Display] Checking network connectivity..."
MAX_WAIT=45
WAITED=0
until curl -sI --connect-timeout 2 "$HEALTH_URL" > /dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
  sleep 2
  WAITED=$((WAITED + 2))
  echo "[Smart Display] Waiting for network... (${WAITED}s / ${MAX_WAIT}s)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "[Smart Display] Warning: Network timeout reached. Attempting browser launch anyway..."
else
  echo "[Smart Display] Network online! Starting dashboard."
fi

# Detect Chromium binary name across OS versions
BROWSER="chromium-browser"
if ! command -v chromium-browser &> /dev/null; then
  BROWSER="chromium"
fi

# Launch Chromium in dedicated fullscreen Kiosk mode inside supervisor loop
while true; do
  echo "[Smart Display] Starting Chromium kiosk..."
  $BROWSER \
    --noerrdialogs \
    --disable-infobars \
    --kiosk \
    --password-store=basic \
    --check-for-update-interval=31536000 \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --autoplay-policy=no-user-gesture-required \
    --remote-debugging-port=9222 \
    --disk-cache-size=1048576 \
    "$TARGET_URL"

  EXIT_CODE=$?
  echo "[Smart Display] Chromium stopped with exit code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
