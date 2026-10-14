#!/usr/bin/env bash
# ==============================================================================
# Loly / Coucou Hook Script for Linux & macOS
# Usage:
#   ./coucou-hook.sh "agent-name" "action-title" "target-or-command" [sync]
# ==============================================================================

AGENT="${1:-gemini-cli}"
TITLE="${2:-Agent Step}"
TARGET="${3:-}"
SYNC_MODE="${4:-async}"

SOCKET_PATH="/tmp/coucou.sock"
HTTP_URL="http://127.0.0.1:4141/api/hook"
if [ "$SYNC_MODE" = "sync" ]; then
  HTTP_URL="http://127.0.0.1:4141/api/hook/sync"
fi

JSON_PAYLOAD=$(cat <<EOF
{
  "coucou_agent": "$AGENT",
  "title": "$TITLE",
  "target": "$TARGET",
  "requires_approval": $( [ "$SYNC_MODE" = "sync" ] && echo "true" || echo "false" )
}
EOF
)

# 1. Try Unix domain socket via socat or nc if available and not sync mode
if [ -S "$SOCKET_PATH" ] && [ "$SYNC_MODE" != "sync" ]; then
  if command -v socat >/dev/null 2>&1; then
    echo "$JSON_PAYLOAD" | socat - UNIX-CONNECT:"$SOCKET_PATH" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      exit 0
    fi
  elif nc -h 2>&1 | grep -q -- "-U"; then
    echo "$JSON_PAYLOAD" | nc -U -w 1 "$SOCKET_PATH" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      exit 0
    fi
  fi
fi

# 2. Fallback to local HTTP
curl -s -X POST "$HTTP_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD"
echo ""
