#!/bin/bash
# Smart Display - Raspberry Pi Hardware Power Management Script
# Usage:
#   ./display_power.sh on    -> Powers on the HDMI display
#   ./display_power.sh off   -> Powers off the HDMI display (DPMS sleep)
#   ./display_power.sh status-> Checks current display power status

ACTION=$1

case "$ACTION" in
  on)
    echo "[$(date)] Turning display ON..."
    # 1. Try HDMI-CEC TV wake (for connected TVs)
    if command -v cec-client &>/dev/null; then
      echo "on 0" | cec-client -s -d 1 2>/dev/null || true
      echo "as" | cec-client -s -d 1 2>/dev/null || true
    fi

    # 2. Try xset DPMS wakeup (X11)
    export DISPLAY=:0
    xset dpms force on 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s off 2>/dev/null || true

    # 3. Try vcgencmd (Raspberry Pi legacy firmware)
    if command -v vcgencmd &>/dev/null; then
      vcgencmd display_power 1 2>/dev/null || true
    fi

    # 4. Try wlr-randr (Wayland / Wayfire on Bookworm)
    if command -v wlr-randr &>/dev/null; then
      wlr-randr --output HDMI-A-1 --on 2>/dev/null || true
    fi
    ;;

  off)
    echo "[$(date)] Turning display OFF (Standby)..."
    # 1. Try HDMI-CEC TV standby (for connected TVs)
    if command -v cec-client &>/dev/null; then
      echo "standby 0" | cec-client -s -d 1 2>/dev/null || true
    fi

    # 2. Try xset DPMS standby (X11)
    export DISPLAY=:0
    xset +dpms 2>/dev/null || true
    xset dpms force off 2>/dev/null || true

    # 3. Try vcgencmd (Raspberry Pi legacy firmware)
    if command -v vcgencmd &>/dev/null; then
      vcgencmd display_power 0 2>/dev/null || true
    fi

    # 4. Try wlr-randr (Wayland on Bookworm)
    if command -v wlr-randr &>/dev/null; then
      wlr-randr --output HDMI-A-1 --off 2>/dev/null || true
    fi
    ;;

  status)
    if command -v vcgencmd &>/dev/null; then
      vcgencmd display_power
    else
      export DISPLAY=:0
      xset q | grep -i "Monitor is"
    fi
    ;;

  *)
    echo "Usage: $0 {on|off|status}"
    exit 1
    ;;
esac
