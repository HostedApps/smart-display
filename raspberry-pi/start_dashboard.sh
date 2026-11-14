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

# Auto-clean crash states and stale sessions to prevent "Restore Pages" warnings or blank session
# restores. Runs before every launch (the watchdog below may have had to stop Chromium).
clean_chromium_state() {
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
}

TARGET_URL="https://smart-kiosk.online/#/display/living-room-display"
HEALTH_URL="https://smart-kiosk.online/"

server_reachable() {
  curl -sI --connect-timeout 3 --max-time 8 "$HEALTH_URL" > /dev/null 2>&1
}

# Wait for network & target server to be reachable before launching Chromium.
# Prevents ERR_NAME_NOT_RESOLVED or a blank white screen on cold boot.
wait_for_server() {
  local max_wait=$1 waited=0
  echo "[Smart Display] Checking network connectivity..."
  until server_reachable || [ $waited -ge $max_wait ]; do
    sleep 2
    waited=$((waited + 2))
    echo "[Smart Display] Waiting for network... (${waited}s / ${max_wait}s)"
  done
  if [ $waited -ge $max_wait ]; then
    echo "[Smart Display] Warning: network timeout reached. Launching anyway; the watchdog will reload once it is back."
  else
    echo "[Smart Display] Network online! Starting dashboard."
  fi
}

# What the kiosk tab is showing, via Chromium's local DevTools endpoint:
#   ok      the dashboard loaded
#   error   a Chromium error page (no network at launch, DNS failure, server down...) or a blank tab
#   unknown DevTools not answering yet
kiosk_tab_state() {
  python3 - <<'PY' 2>/dev/null || echo unknown
import json, urllib.request
try:
    tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=4).read())
except Exception:
    print('unknown'); raise SystemExit
pages = [t for t in tabs if t.get('type') == 'page']
if not pages:
    print('error'); raise SystemExit
url = pages[0].get('url', '')
title = pages[0].get('title', '')
# Error pages report chrome-error://chromewebdata/ (or keep the URL with the host name as title)
if url.startswith('chrome-error://') or url in ('', 'about:blank') or title == 'smart-kiosk.online':
    print('error')
else:
    print('ok')
PY
}

# Watchdog: if Chromium is stuck on an error page while the server is reachable, stop it so the
# supervisor loop relaunches it. A screen that booted before Wi-Fi recovers by itself.
watch_kiosk() {
  sleep 30
  local strikes=0
  while pgrep -f -- "--remote-debugging-port=9222" > /dev/null; do
    if [ "$(kiosk_tab_state)" = "error" ] && server_reachable; then
      strikes=$((strikes + 1))
      # Two checks in a row (~30 s): don't kill a page that is still loading
      if [ $strikes -ge 2 ]; then
        echo "[Smart Display] Kiosk is on an error page but the server is reachable. Restarting Chromium..."
        pkill -TERM -f -- "--remote-debugging-port=9222"
        return
      fi
    else
      strikes=0
    fi
    sleep 15
  done
}

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
  wait_for_server 45
  clean_chromium_state
  echo "[Smart Display] Starting Chromium kiosk..."
  watch_kiosk &
  WATCHDOG_PID=$!
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
  kill $WATCHDOG_PID 2>/dev/null || true
  echo "[Smart Display] Chromium stopped with exit code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
