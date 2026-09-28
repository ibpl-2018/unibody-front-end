#!/bin/bash
# Unibody — run the app on the iPhone 17 Pro Max simulator (the project's reference device).
# Native build works on Xcode 26.0+ (patches/expo-modules-jsi makes Expo SDK 57 build with Swift 6.2).
# Usage:  ./tools/run-ios.sh            native dev build, Metro on $PORT (default 8083 — 8081 is AdFire's)
#         ./tools/run-ios.sh --release  native Release build (JS embedded, no Metro; real splash → intro)
#         ./tools/run-ios.sh --go       Expo Go instead of a native build
# Override the device with SIM="iPhone 17 Pro" ./tools/run-ios.sh
set -e
cd "$(dirname "$0")/.."

SIM="${SIM:-iPhone 17 Pro Max}"
PORT="${PORT:-8083}"
export LANG="${LANG:-en_US.UTF-8}" LC_ALL="${LC_ALL:-en_US.UTF-8}" # CocoaPods needs a UTF-8 locale

command -v xcrun >/dev/null || { echo "✖ Xcode not found. Install Xcode from the App Store."; exit 1; }
UDID=$(xcrun simctl list devices available | grep -E "^\s+$SIM \(" | head -1 | grep -oE '[0-9A-F-]{36}')
[ -n "$UDID" ] || { echo "✖ '$SIM' simulator not found. Xcode → Settings → Components → install an iOS runtime."; exit 1; }
[ -d node_modules ] || npm ci

echo "▶ Booting $SIM ($UDID)…"
xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$UDID"
xcrun simctl bootstatus "$UDID" >/dev/null

if [ "$1" = "--release" ]; then
  echo "▶ Native Release build on $SIM…"
  npx expo run:ios --configuration Release --device "$UDID" --no-bundler
elif [ "$1" != "--go" ]; then
  echo "▶ Native dev build on $SIM (Metro :$PORT)…"
  npx expo run:ios --device "$UDID" --port "$PORT"
else
  echo "▶ Expo Go on $SIM (port $PORT)."
  # --lan binds all interfaces (--host localhost binds IPv6 only and the simulator can't reach it).
  npx expo start --go --lan --port "$PORT" &
  EXPO_PID=$!
  trap 'kill $EXPO_PID 2>/dev/null' EXIT
  until curl -s "http://127.0.0.1:$PORT/status" | grep -q running; do sleep 1; done
  xcrun simctl openurl "$UDID" "exp://127.0.0.1:$PORT"
  wait $EXPO_PID
fi
