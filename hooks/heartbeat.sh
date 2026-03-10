#!/usr/bin/env bash
# Claude Code notification hook — sends heartbeat to Agent Dashboard
# Required env vars: DASHBOARD_URL, DASHBOARD_TOKEN

set -euo pipefail

PAYLOAD=$(cat)

# Extract notification_type from hook JSON (requires jq)
NOTIF_TYPE=$(echo "$PAYLOAD" | jq -r '.notification_type // "idle"' 2>/dev/null || echo "idle")

case "$NOTIF_TYPE" in
  busy)                STATUS="working" ;;
  permission_request)  STATUS="awaiting_permission" ;;
  *)                   STATUS="idle" ;;
esac

# Session identity
SESSION_ID="${CLAUDE_SESSION_ID:-$(echo "${HOSTNAME}${CLAUDE_PROJECT_DIR:-$(pwd)}" | md5sum | cut -c1-16)}"
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

curl --silent --max-time 3 \
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
