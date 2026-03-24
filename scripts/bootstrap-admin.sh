#!/usr/bin/env bash
# =============================================================================
# Bootstrap the first admin account for Furrie
#
# Prerequisites:
#   1. Set ADMIN_BOOTSTRAP_SECRET in your .env.local
#   2. App must be running (locally or deployed)
#
# Usage:
#   ./scripts/bootstrap-admin.sh
#
# This script will ONLY work if no admin exists yet.
# =============================================================================

set -euo pipefail

# Default to local dev
BASE_URL="${FURRIE_URL:-http://localhost:3000}"

echo "=== Furrie Admin Bootstrap ==="
echo ""
echo "This will create the FIRST admin account."
echo "Target: $BASE_URL"
echo ""

# Prompt for details
read -rp "Admin email: " ADMIN_EMAIL
read -rp "Admin full name: " ADMIN_NAME
read -rsp "Admin password (min 8 chars): " ADMIN_PASSWORD
echo ""
read -rsp "Bootstrap secret (ADMIN_BOOTSTRAP_SECRET from .env): " BOOTSTRAP_SECRET
echo ""

echo ""
echo "Creating admin: $ADMIN_NAME ($ADMIN_EMAIL)..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/bootstrap" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"fullName\": \"$ADMIN_NAME\",
    \"secret\": \"$BOOTSTRAP_SECRET\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "Admin account created successfully!"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  echo "You can now log in at the admin portal."
elif [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "Existing user upgraded to admin!"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo ""
  echo "Error (HTTP $HTTP_CODE):"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi
