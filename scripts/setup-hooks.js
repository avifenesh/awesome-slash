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
# 1. Run all validation checks (counts, paths, cross-platform docs, agent-skill compliance)
# 2. Run agent-skill compliance check if agents/skills modified
# 3. Warn if agents/skills/hooks/prompts modified (run /enhance)
# 4. Block version tag pushes until release checklist passes
# See: CLAUDE.md Critical Rule #7, checklists/release.md, checklists/new-skill.md

echo ""
echo "=============================================="
echo "  Pre-Push Validation"
echo "=============================================="
echo ""

# Check for modified agents/skills first (we'll use this info twice)
modified_files=$(git diff --name-only origin/\$(git remote show origin | grep "HEAD branch" | cut -d' ' -f5)..HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD)

agents_modified=$(echo "$modified_files" | grep -E "agents/.*\\.md$" || true)
skills_modified=$(echo "$modified_files" | grep -E "skills/.*/SKILL\\.md$" || true)
hooks_modified=$(echo "$modified_files" | grep -E "hooks/.*\\.md$" || true)
prompts_modified=$(echo "$modified_files" | grep -E "prompts/.*\\.md$" || true)

# Run validation suite
echo "[1/4] Running validation checks..."
if ! npm run validate --silent 2>&1 | grep -E "\\[OK\\]|\\[ERROR\\]"; then
  echo ""
  echo "[ERROR] BLOCKED: Validation failed"
  echo "   Fix issues and try again"
  echo "   Skip: git push --no-verify"
  exit 1
fi
echo "[OK] Validation passed"
echo ""

# Run agent-skill compliance if agents or skills were modified
echo "[2/4] Checking agent-skill compliance..."
if [ -n "$agents_modified" ] || [ -n "$skills_modified" ]; then
  echo "     Agent/skill files modified - running compliance check..."
  if ! node scripts/validate-agent-skill-compliance.js 2>&1 | grep -E "\\[OK\\]|\\[ERROR\\]"; then
    echo ""
    echo "[ERROR] BLOCKED: Agent-skill compliance failed"
    echo "   See: checklists/new-skill.md"
    echo "   Fix: Ensure agents invoking skills have Skill tool"
    echo "   Fix: Ensure skill directory names match skill names"
    exit 1
  fi
else
  echo "[OK] No agent/skill files modified"
fi
echo ""

# Check for modified agents/skills/hooks/prompts
echo "[3/4] Checking for enhanced content modifications..."
if [ -n "$agents_modified" ] || [ -n "$skills_modified" ] || [ -n "$hooks_modified" ] || [ -n "$prompts_modified" ]; then
  echo ""
  echo "CLAUDE.md Critical Rule #7 requires running /enhance"
  echo "on modified agents, skills, hooks, or prompts."
  echo ""
  echo "Modified files:"
  echo "$agents_modified$skills_modified$hooks_modified$prompts_modified"
  echo ""
  # Check for env var first (for non-interactive/CI contexts)
  if [ "\$ENHANCE_CONFIRMED" = "1" ]; then
    echo "[OK] /enhance confirmed via ENHANCE_CONFIRMED=1"
  elif [ -t 0 ]; then
    # Interactive mode - prompt user
    read -p "Have you run /enhance on these files? (y/N) " response
    if [ "\$response" != "y" ] && [ "\$response" != "Y" ]; then
      echo "[BLOCKED] Run /enhance first"
      echo "   Skip: ENHANCE_CONFIRMED=1 git push"
      exit 1
    fi
    echo "[OK] /enhance confirmed"
  else
    # Non-interactive, no env var - block
    echo "[BLOCKED] Run /enhance first"
    echo "   For non-interactive: ENHANCE_CONFIRMED=1 git push"
    exit 1
  fi
else
  echo "[OK] No enhanced content modified"
fi
echo ""

# Check if pushing a version tag (v*)
echo "[4/4] Checking for version tag..."
pushing_tag=false
while read local_ref local_sha remote_ref remote_sha; do
  if echo "$local_ref" | grep -q "^refs/tags/v"; then
    pushing_tag=true
    tag_name=$(echo "$local_ref" | sed 's|refs/tags/||')
    break
  fi
done

if [ "$pushing_tag" = "false" ]; then
  echo "[OK] No version tag detected"
  echo ""
  echo "=============================================="
  echo "  [OK] Pre-Push Validation PASSED"
  echo "=============================================="
  echo ""
  exit 0
fi

echo ""
echo "=============================================="
echo "  RELEASE TAG DETECTED: $tag_name"
echo "=============================================="
echo ""
echo "Running release checklist validation..."
echo ""

# 1. Tests already validated above
echo "[1/2] Running npm test..."
if ! npm test --silent 2>/dev/null; then
  echo ""
  echo "[ERROR] BLOCKED: Tests failed"
  echo "   Fix failing tests and try again"
  exit 1
fi
echo "[OK] Tests passed"

# 2. Verify package builds
echo ""
echo "[2/2] Running npm pack --dry-run..."
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

function main() {
  // Only run in git repo (not when installed as npm package)
  if (!fs.existsSync(hookDir)) {
    // Not a git repo or installed as dependency - skip silently
    return 0;
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

  return 0;
}

if (require.main === module) {
  const code = main();
  if (typeof code === 'number') process.exit(code);
}

module.exports = { main };
