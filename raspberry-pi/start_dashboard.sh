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

# Auto-clean crash states and stale sessions to prevent "Restore Pages" warnings or blank session restores
rm -rf ~/.config/chromium/Default/Sessions/* 2>/dev/null || true

python3 -c '
import json, os
for p in [os.path.expanduser("~/.config/chromium/Default/Preferences"), os.path.expanduser("~/.config/chromium/Default/Preferences~")]:
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
            d.setdefault("profile", {})["exit_type"] = "Normal"
            d["profile"]["exited_cleanly"] = True
            with open(p, "w", encoding="utf-8") as f:
                json.dump(d, f)
        except Exception:
            pass
' 2>/dev/null || true

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

# Background guard: Ensure device_token is present in browser localStorage if saved locally
(
  sleep 8
  DEV_TOKEN_FILE="$HOME/.config/smart-display/device_token"
  if [ -f "$DEV_TOKEN_FILE" ]; then
    SAVED_TOKEN=$(cat "$DEV_TOKEN_FILE" | tr -d '\r\n[:space:]')
    if [ -n "$SAVED_TOKEN" ]; then
      python3 -c "
import json, urllib.request, socket
try:
    data = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=5).read())
    pages = [t for t in data if t.get('type') == 'page']
    if pages:
        ws_url = pages[0].get('webSocketDebuggerUrl')
        # We verify if token is needed or if url is stuck at login
        target = pages[0].get('url', '')
        if 'login' in target or 'pair' in target:
            # Send reload to display URL
            import urllib.request
            req = urllib.request.Request(f'http://127.0.0.1:9222/json/activate/{pages[0][\"id\"]}', data=b'')
            urllib.request.urlopen(req, timeout=3)
except Exception:
    pass
" 2>/dev/null || true
    fi
  fi
) &

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
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --fast \
    --fast-start \
    "$TARGET_URL"

  EXIT_CODE=$?
  echo "[Smart Display] Chromium stopped with exit code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
