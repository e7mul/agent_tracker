#!/usr/bin/env bash
# Claude Code notification hook — sends heartbeat to Agent Dashboard
# Required env vars: DASHBOARD_URL, DASHBOARD_TOKEN
# Optional env vars: HEARTBEAT_INTERVAL (seconds, default 120)
#                    HEARTBEAT_MAX_IDLE  (seconds, default 600)

set -euo pipefail

PAYLOAD=$(cat)

# Extract notification_type from hook JSON (requires jq)
NOTIF_TYPE=$(echo "$PAYLOAD" | jq -r '.notification_type // "idle"' 2>/dev/null || echo "idle")

case "$NOTIF_TYPE" in
  busy)                STATUS="working" ;;
  permission_request)  STATUS="awaiting_permission" ;;
  *)                   STATUS="idle" ;;
esac

# Session identity (macOS uses `md5`, Linux uses `md5sum`)
_md5() { md5 -q 2>/dev/null || md5sum | cut -c1-32; }
SESSION_ID="${CLAUDE_SESSION_ID:-$(echo "${HOSTNAME}${CLAUDE_PROJECT_DIR:-$(pwd)}" | _md5 | cut -c1-16)}"
MACHINE_ID="${HOSTNAME:-$(hostname)}"
MACHINE_HOSTNAME="${HOSTNAME:-$(hostname)}"
PROJECT_PATH="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PROJECT_NAME="$(basename "$PROJECT_PATH")"
GIT_BRANCH="$(git -C "$PROJECT_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
GIT_REPO="$(git -C "$PROJECT_PATH" remote get-url origin 2>/dev/null || echo "")"

# Context percentage
if [[ -n "${CLAUDE_CONTEXT_TOKENS_USED:-}" && -n "${CLAUDE_CONTEXT_TOKENS_MAX:-}" && "$CLAUDE_CONTEXT_TOKENS_MAX" -gt 0 ]]; then
  CONTEXT_PCT=$(( CLAUDE_CONTEXT_TOKENS_USED * 100 / CLAUDE_CONTEXT_TOKENS_MAX ))
else
  CONTEXT_PCT=0
fi

NOTIFICATION_MESSAGE=$(echo "$PAYLOAD" | jq -r '.message // ""' 2>/dev/null || echo "")

# ── Send heartbeat ────────────────────────────────────────────────────────────
send_heartbeat() {
  /usr/bin/curl --silent --max-time 3 \
    -X POST "${DASHBOARD_URL}/api/heartbeat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${DASHBOARD_TOKEN}" \
    -d "{
      \"session_id\": \"${SESSION_ID}\",
      \"machine_id\": \"${MACHINE_ID}\",
      \"machine_hostname\": \"${MACHINE_HOSTNAME}\",
      \"project_name\": \"${PROJECT_NAME}\",
      \"project_path\": \"${PROJECT_PATH}\",
      \"git_branch\": \"${GIT_BRANCH}\",
      \"git_repo\": \"${GIT_REPO}\",
      \"status\": \"${STATUS}\",
      \"context_pct\": ${CONTEXT_PCT},
      \"notification_message\": \"${NOTIFICATION_MESSAGE}\"
    }" || true  # never block the Claude session
}

send_heartbeat

# ── Periodic heartbeat daemon ─────────────────────────────────────────────────
# Keeps the session alive during long tool executions between notifications.
# Daemon re-sends the last known state every HEARTBEAT_INTERVAL seconds.
# It stops itself after HEARTBEAT_MAX_IDLE seconds of no new notifications,
# allowing the server's stale sweep to mark the session stopped naturally.

INTERVAL="${HEARTBEAT_INTERVAL:-120}"   # re-send interval (default 2 min)
MAX_IDLE="${HEARTBEAT_MAX_IDLE:-600}"   # stop daemon after 10 min of silence

STATEFILE="/tmp/claude-hb-${SESSION_ID}.env"
PIDFILE="/tmp/claude-hb-${SESSION_ID}.pid"

# Write current state — daemon sources this on each iteration, so it always
# sends the most recent status even if it started before the state changed.
cat > "$STATEFILE" <<EOF
DASHBOARD_URL="$DASHBOARD_URL"
DASHBOARD_TOKEN="$DASHBOARD_TOKEN"
SESSION_ID="$SESSION_ID"
MACHINE_ID="$MACHINE_ID"
MACHINE_HOSTNAME="$MACHINE_HOSTNAME"
PROJECT_NAME="$PROJECT_NAME"
PROJECT_PATH="$PROJECT_PATH"
GIT_BRANCH="$GIT_BRANCH"
GIT_REPO="$GIT_REPO"
STATUS="$STATUS"
CONTEXT_PCT="$CONTEXT_PCT"
NOTIFICATION_MESSAGE="$NOTIFICATION_MESSAGE"
EOF

# If a daemon is already running for this session, the state update above is
# enough — it will pick up the new status on its next sleep cycle.
if [[ -f "$PIDFILE" ]]; then
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    exit 0
  fi
fi

# Spawn daemon in background (detached from this process)
(
  set +e  # daemon must not exit on any individual failure
  # cross-platform mtime: macOS = stat -f '%m', Linux = stat -c '%Y'
  _mtime() { stat -f '%m' "$1" 2>/dev/null || stat -c '%Y' "$1" 2>/dev/null || echo 0; }

  while true; do
    sleep "$INTERVAL"

    [[ -f "$STATEFILE" ]] || break

    # Stop if no real notification has arrived for MAX_IDLE seconds.
    # The server's stale sweep will mark the session stopped naturally.
    MTIME=$(_mtime "$STATEFILE")
    NOW=$(date +%s)
    if (( NOW - MTIME > MAX_IDLE )); then
      rm -f "$STATEFILE" "$PIDFILE"
      break
    fi

    # Source latest state (status may have changed since daemon started)
    # shellcheck source=/dev/null
    source "$STATEFILE"

    /usr/bin/curl --silent --max-time 3 \
      -X POST "${DASHBOARD_URL}/api/heartbeat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${DASHBOARD_TOKEN}" \
      -d "{
        \"session_id\": \"${SESSION_ID}\",
        \"machine_id\": \"${MACHINE_ID}\",
        \"machine_hostname\": \"${MACHINE_HOSTNAME}\",
        \"project_name\": \"${PROJECT_NAME}\",
        \"project_path\": \"${PROJECT_PATH}\",
        \"git_branch\": \"${GIT_BRANCH}\",
        \"git_repo\": \"${GIT_REPO}\",
        \"status\": \"${STATUS}\",
        \"context_pct\": ${CONTEXT_PCT},
        \"notification_message\": \"${NOTIFICATION_MESSAGE}\"
      }" || true
  done

  rm -f "$PIDFILE"
) &

echo $! > "$PIDFILE"
