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
    # 1. Try xset DPMS wakeup (X11)
    export DISPLAY=:0
    xset dpms force on 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s off 2>/dev/null || true

    # 2. Try vcgencmd (Raspberry Pi legacy firmware)
    if command -v vcgencmd &>/dev/null; then
      vcgencmd display_power 1 2>/dev/null || true
    fi

    # 3. Try wlr-randr (Wayland / Wayfire on Bookworm)
    if command -v wlr-randr &>/dev/null; then
      wlr-randr --output HDMI-A-1 --on 2>/dev/null || true
    fi
    ;;

  off)
    echo "[$(date)] Turning display OFF (Standby)..."
    export DISPLAY=:0
    # 1. Try xset DPMS standby (X11)
    xset +dpms 2>/dev/null || true
    xset dpms force off 2>/dev/null || true

    # 2. Try vcgencmd (Raspberry Pi legacy firmware)
    if command -v vcgencmd &>/dev/null; then
      vcgencmd display_power 0 2>/dev/null || true
    fi

    # 3. Try wlr-randr (Wayland on Bookworm)
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
