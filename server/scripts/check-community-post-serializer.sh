#!/usr/bin/env bash
# Enforce: every raw SELECT against community_posts must be paired with serializeCommunityPost.
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Allowlist: files that may query community_posts directly but are expected to
# pass result through serializeCommunityPost.
EXPECTED_CALLERS=(
  "src/controllers/communityController.js"
  "src/controllers/userController.js"
)

FAILURES=0
for file in $(grep -rln "FROM community_posts" src --include='*.js' || true); do
  rel="${file#$ROOT/}"
  if ! grep -q "serializeCommunityPost" "$file"; then
    echo "::error::$rel has FROM community_posts but does not import/use serializeCommunityPost"
    FAILURES=$((FAILURES + 1))
  fi
done

if [ $FAILURES -gt 0 ]; then
  echo ""
  echo "One or more files read community_posts without passing through the redaction helper."
  echo "Ensure serializeCommunityPost(post, viewer) is applied before returning to client."
  exit 1
fi

echo "✅ All community_posts read paths import serializeCommunityPost"
