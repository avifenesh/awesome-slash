#!/usr/bin/env node
/**
 * Setup git hooks for development
 * - pre-commit: Auto-syncs lib/ to plugins/
 * - pre-push: Blocks version tag pushes until validation passes
 */

const fs = require('fs');
const path = require('path');

const hookDir = path.join(__dirname, '..', '.git', 'hooks');
const preCommitPath = path.join(hookDir, 'pre-commit');
const prePushPath = path.join(hookDir, 'pre-push');

const preCommitHook = `#!/bin/sh
# Auto-sync lib/ to plugins/ when lib/ files are staged

if git diff --cached --name-only | grep -q "^lib/"; then
  echo "lib/ changes detected, syncing to plugins..."
  bash scripts/sync-lib.sh
  git add plugins/*/lib/
  echo "Synced and staged plugin lib/ copies"
fi
`;

const prePushHook = `#!/bin/sh
# Pre-push validations:
# 1. Warn if agents/skills/hooks/prompts modified (run /enhance)
# 2. Block version tag pushes until release checklist passes
# See: CLAUDE.md Critical Rule #7, checklists/release.md

# Check for modified agents/skills/hooks/prompts
modified_files=$(git diff --name-only origin/\$(git remote show origin | grep "HEAD branch" | cut -d' ' -f5)..HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD)

agents_modified=$(echo "$modified_files" | grep -E "agents/.*\\.md$" || true)
skills_modified=$(echo "$modified_files" | grep -E "skills/.*/SKILL\\.md$" || true)
hooks_modified=$(echo "$modified_files" | grep -E "hooks/.*\\.md$" || true)
prompts_modified=$(echo "$modified_files" | grep -E "prompts/.*\\.md$" || true)

if [ -n "$agents_modified" ] || [ -n "$skills_modified" ] || [ -n "$hooks_modified" ] || [ -n "$prompts_modified" ]; then
  echo ""
  echo "=============================================="
  echo "  [WARN] Enhanced content modified"
  echo "=============================================="
  echo ""
  echo "CLAUDE.md Critical Rule #7 requires running /enhance"
  echo "on modified agents, skills, hooks, or prompts."
  echo ""
  echo "Modified files:"
  echo "$agents_modified$skills_modified$hooks_modified$prompts_modified"
  echo ""
  echo "ACTION REQUIRED:"
  echo "  1. Run: /enhance"
  echo "  2. Address any HIGH certainty findings"
  echo "  3. Push again"
  echo ""
  echo "Skip this check: git push --no-verify"
  echo ""
  read -p "Have you run /enhance? (y/N) " response
  if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
    echo "[BLOCKED] Run /enhance first"
    exit 1
  fi
fi

# Check if pushing a version tag (v*)
pushing_tag=false
while read local_ref local_sha remote_ref remote_sha; do
  if echo "$local_ref" | grep -q "^refs/tags/v"; then
    pushing_tag=true
    tag_name=$(echo "$local_ref" | sed 's|refs/tags/||')
    break
  fi
done

if [ "$pushing_tag" = "false" ]; then
  exit 0
fi

echo ""
echo "=============================================="
echo "  RELEASE TAG DETECTED: $tag_name"
echo "=============================================="
echo ""
echo "Running release checklist validation..."
echo ""

# 1. Run validation
echo "[1/3] Running npm run validate..."
if ! npm run validate --silent; then
  echo ""
  echo "[ERROR] BLOCKED: Validation failed"
  echo "   Fix issues and try again"
  exit 1
fi
echo "[OK] Validation passed"

# 2. Run tests
echo ""
echo "[2/3] Running npm test..."
if ! npm test --silent 2>/dev/null; then
  echo ""
  echo "[ERROR] BLOCKED: Tests failed"
  echo "   Fix failing tests and try again"
  exit 1
fi
echo "[OK] Tests passed"

# 3. Verify package builds
echo ""
echo "[3/3] Running npm pack --dry-run..."
if ! npm pack --dry-run --silent 2>/dev/null; then
  echo ""
  echo "[ERROR] BLOCKED: Package build failed"
  echo "   Fix package issues and try again"
  exit 1
fi
echo "[OK] Package builds correctly"

echo ""
echo "=============================================="
echo "  [OK] Release checklist validation PASSED"
echo "=============================================="
echo ""
echo "Reminder: Did you also verify cross-platform?"
echo "  See: checklists/release.md"
echo ""
`;

// Only run in git repo (not when installed as npm package)
if (!fs.existsSync(hookDir)) {
  // Not a git repo or installed as dependency - skip silently
  process.exit(0);
}

try {
  fs.writeFileSync(preCommitPath, preCommitHook, { mode: 0o755 });
  console.log('Git pre-commit hook installed');
} catch (err) {
  // Non-fatal - might not have write permissions
  console.warn('Could not install pre-commit hook:', err.message);
}

try {
  fs.writeFileSync(prePushPath, prePushHook, { mode: 0o755 });
  console.log('Git pre-push hook installed (release tag validation)');
} catch (err) {
  // Non-fatal - might not have write permissions
  console.warn('Could not install pre-push hook:', err.message);
}
