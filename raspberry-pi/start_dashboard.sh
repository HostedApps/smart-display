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

# Tiny DevTools client (Python standard library only: Raspberry Pi OS has no websocket module).
#   kiosk_cdp state         prints ok | stuck | unknown
#   kiosk_cdp navigate URL  tells the kiosk tab to load URL
# "stuck" means the document in the tab isn't the dashboard's site: a Chromium error page, or a
# blank page left behind when the first load never finished (seen on a Pi after Chromium's network
# service crashed during start-up: DevTools still lists the dashboard URL, but the tab is about:blank).
CDP_HELPER="$HOME/.cache/smart-display/kiosk_cdp.py"
mkdir -p "$(dirname "$CDP_HELPER")"
cat > "$CDP_HELPER" <<'PY'
import base64, json, os, socket, struct, sys, urllib.request
from urllib.parse import urlparse

def tab():
    tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=4).read())
    pages = [t for t in tabs if t.get('type') == 'page']
    return pages[0] if pages else None

def call(ws_url, method, params):
    u = urlparse(ws_url)
    s = socket.create_connection((u.hostname, u.port), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(('GET %s HTTP/1.1\r\nHost: %s:%s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
               'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (u.path, u.hostname, u.port, key)).encode())
    buf = b''
    while b'\r\n\r\n' not in buf:
        chunk = s.recv(4096)
        if not chunk: raise IOError('handshake failed')
        buf += chunk
    buf = buf.split(b'\r\n\r\n', 1)[1]
    data = json.dumps({'id': 1, 'method': method, 'params': params}).encode()
    mask = os.urandom(4)
    n = len(data)
    hdr = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack('>H', n))
    s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    def take(k):
        nonlocal buf
        while len(buf) < k:
            chunk = s.recv(65536)
            if not chunk: raise IOError('closed')
            buf += chunk
        out, buf = buf[:k], buf[k:]
        return out
    while True:
        b1, b2 = take(2)
        k = b2 & 0x7f
        if k == 126: k = struct.unpack('>H', take(2))[0]
        elif k == 127: k = struct.unpack('>Q', take(8))[0]
        msg = json.loads(take(k))
        if msg.get('id') == 1:
            s.close()
            return msg.get('result', {})

try:
    t = tab()
except Exception:
    print('unknown'); sys.exit(0)
if sys.argv[1] == 'state':
    if not t:
        print('stuck'); sys.exit(0)
    want = urlparse(sys.argv[2]).netloc
    try:
        r = call(t['webSocketDebuggerUrl'], 'Runtime.evaluate', {'expression': 'location.host', 'returnByValue': True})
        host = r.get('result', {}).get('value')
    except Exception:
        print('unknown'); sys.exit(0)
    print('ok' if host == want else 'stuck')
elif sys.argv[1] == 'navigate' and t:
    try:
        call(t['webSocketDebuggerUrl'], 'Page.navigate', {'url': sys.argv[2]})
    except Exception:
        pass
PY

kiosk_state() {
  python3 "$CDP_HELPER" state "$TARGET_URL" 2>/dev/null || echo unknown
}

# Watchdog: if the kiosk tab isn't showing the dashboard while the server is reachable, load it
# again; if that doesn't help, stop Chromium so the supervisor loop relaunches it. A screen that
# booted before Wi-Fi, or whose first load hung, recovers by itself instead of staying white.
watch_kiosk() {
  sleep 30
  local strikes=0
  while pgrep -f -- "--remote-debugging-port=9222" > /dev/null; do
    if [ "$(kiosk_state)" = "stuck" ] && server_reachable; then
      strikes=$((strikes + 1))
      # Two checks in a row (~30 s) so a page that is still loading isn't touched
      if [ $strikes -eq 2 ]; then
        echo "[Smart Display] Kiosk tab isn't showing the dashboard. Loading it again..."
        python3 "$CDP_HELPER" navigate "$TARGET_URL" 2>/dev/null || true
      elif [ $strikes -ge 4 ]; then
        echo "[Smart Display] Kiosk still not showing the dashboard. Restarting Chromium..."
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
