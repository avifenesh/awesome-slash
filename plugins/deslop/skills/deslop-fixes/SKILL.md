---
name: deslop-fixes
description: "Use when applying fixes for detected slop. Apply auto-fixes for HIGH certainty findings with verification and rollback on failure."
version: 1.0.0
argument-hint: "<findings-json> [--dry-run]"
---

# deslop-fixes

Apply auto-fixes for slop findings.

## Input

Arguments: `<findings-json> [--dry-run] [--max-changes N]`

- **findings-json**: JSON array of findings from deslop-detection
- **--dry-run**: Show what would be changed without applying
- **--max-changes**: Maximum number of fixes to apply (default: 10)

## Fix Types

### 1. remove-line

Remove the entire line containing the slop.

```javascript
// Before
console.log("debug");

// After
// (line removed)
```

Applicable to:
- `debug-statement` (console.log, console.debug)
- `debug-import` (import debug from 'debug')

### 2. add-comment

Add a comment explaining why empty.

```javascript
// Before
catch (e) {}

// After
catch (e) {
  // Error intentionally ignored
}
```

Applicable to:
- `empty-catch`

### 3. remove-block

Remove a block of code.

```javascript
// Before
// TODO: implement
function placeholder() {
  return null;
}

// After
// (block removed)
```

Applicable to:
- `stub-function` with TODO comment

## Execution

### 1. Filter Fixable Items

```javascript
const fixable = findings.filter(f =>
  f.certainty === 'HIGH' &&
  f.autoFix === true
);

const toApply = fixable.slice(0, maxChanges);
```

### 2. Apply Fixes

For each fixable item:

```javascript
async function applyFix(finding) {
  const content = await readFile(finding.file);
  const lines = content.split('\n');

  switch (finding.fixType) {
    case 'remove-line':
      lines.splice(finding.line - 1, 1);
      break;

    case 'add-comment':
      // Find empty block and add comment
      const lineContent = lines[finding.line - 1];
      if (lineContent.includes('{}')) {
        lines[finding.line - 1] = lineContent.replace(
          '{}',
          '{ /* Error intentionally ignored */ }'
        );
      }
      break;

    case 'remove-block':
      // Find block boundaries and remove
      const startLine = finding.line - 1;
      const endLine = findBlockEnd(lines, startLine);
      lines.splice(startLine, endLine - startLine + 1);
      break;
  }

  await writeFile(finding.file, lines.join('\n'));
}
```

### 3. Verify After Each Fix

```bash
npm test 2>&1 | head -20
```

If tests fail:
```bash
git restore <file>
```

### 4. Commit Changes

```bash
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "fix: remove AI slop (auto-applied)"
fi
```

## Output Format

```json
{
  "applied": [
    {
      "file": "src/api.js",
      "line": 42,
      "pattern": "debug-statement",
      "fixType": "remove-line"
    }
  ],
  "skipped": [
    {
      "file": "src/utils.js",
      "line": 15,
      "pattern": "excessive-comments",
      "reason": "Not auto-fixable"
    }
  ],
  "failed": [
    {
      "file": "src/auth.js",
      "line": 88,
      "pattern": "empty-catch",
      "reason": "Verification failed, rolled back"
    }
  ],
  "committed": true
}
```

## Safety Rules

1. Only fix HIGH certainty items
2. Verify after EVERY fix
3. Rollback on verification failure
4. One atomic commit for all successful fixes
5. Never modify files outside scope
6. Respect .gitignore patterns

## Error Handling

- **File not found**: Skip, report in `skipped`
- **Verification fails**: Rollback, report in `failed`
- **Git not available**: Exit with error
- **Parse error**: Skip file, continue with others

## Dry Run Mode

When `--dry-run` is set:

```markdown
## Dry Run: Fixes That Would Be Applied

| # | File | Line | Fix |
|---|------|------|-----|
| 1 | src/api.js:42 | remove-line | console.log |
| 2 | src/auth.js:15 | add-comment | empty catch |

**Total**: 2 fixes would be applied

Run without --dry-run to apply.
```
