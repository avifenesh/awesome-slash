---
name: deslop-detection
description: "Use when scanning for AI slop patterns, debug statements, or code cleanup. Wraps lib/patterns/pipeline.js + repo-map for AST-based detection with certainty levels."
version: 1.0.0
argument-hint: "<scope-path> [--thoroughness quick|normal|deep]"
---

# deslop-detection

Scan codebase for AI slop patterns with certainty-based findings.

## Input

Arguments: `<scope-path> [--thoroughness quick|normal|deep] [--compact]`

- **scope-path**: Directory or file to scan (default: `.`)
- **--thoroughness**: Analysis depth (default: `normal`)
  - `quick`: Regex patterns only
  - `normal`: + multi-pass analyzers
  - `deep`: + CLI tools (jscpd, madge) if available
- **--compact**: Reduce output verbosity

## Detection Pipeline

### 1. Run Detection Script

```bash
PLUGIN_ROOT=$(node -e "const { getPluginRoot } = require('@awesome-slash/lib/cross-platform'); const root = getPluginRoot('deslop'); if (!root) { console.error('Error: Could not locate deslop plugin root'); process.exit(1); } console.log(root);")
node "$PLUGIN_ROOT/scripts/detect.js" <scope> --thoroughness <level> --json
```

### 2. Repo-Map Enhancement (Optional)

If repo-map exists, enhance detection with AST-based analysis:

```javascript
const repoMap = require('@awesome-slash/lib/repo-map');

if (repoMap.exists(basePath)) {
  const map = repoMap.load(basePath);
  const usageIndex = repoMap.buildUsageIndex(map);

  // Find orphaned infrastructure with HIGH certainty
  const orphaned = repoMap.findOrphanedInfrastructure(map, usageIndex);
  for (const item of orphaned) {
    findings.push({
      file: item.file,
      line: item.line,
      pattern: 'orphaned-infrastructure',
      message: `${item.name} (${item.type}) is never used`,
      certainty: 'HIGH',
      severity: 'high',
      autoFix: false
    });
  }

  // Find unused exports
  const unusedExports = repoMap.findUnusedExports(map, usageIndex);
  for (const item of unusedExports) {
    findings.push({
      file: item.file,
      line: item.line,
      pattern: 'unused-export',
      message: `Export '${item.name}' is never imported`,
      certainty: item.certainty,
      severity: 'medium',
      autoFix: false
    });
  }
}
```

## Output Format

JSON structure:

```json
{
  "scope": "path",
  "filesScanned": 42,
  "durationMs": 1234,
  "findings": [
    {
      "file": "src/api.js",
      "line": 42,
      "pattern": "debug-statement",
      "message": "console.log found",
      "certainty": "HIGH",
      "severity": "medium",
      "autoFix": true,
      "fixType": "remove-line"
    }
  ],
  "summary": {
    "high": 5,
    "medium": 12,
    "low": 3,
    "autoFixable": 5
  }
}
```

## Certainty Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **HIGH** | Definitely slop, safe to auto-fix | Auto-fix |
| **MEDIUM** | Likely slop, needs verification | Review first |
| **LOW** | Possible slop, context-dependent | Flag only |

## Pattern Categories

### HIGH Certainty (Auto-Fixable)

- `debug-statement`: console.log, console.debug
- `debug-import`: Unused debug/logging imports
- `placeholder-text`: "Lorem ipsum", "TODO: implement"
- `empty-catch`: Empty catch blocks without comment

### MEDIUM Certainty (Review Required)

- `excessive-comments`: Comment/code ratio > 2:1
- `doc-code-ratio`: JSDoc > 3x function body
- `stub-function`: Returns placeholder value only
- `dead-code`: Unreachable after return/throw

### LOW Certainty (Flag Only)

- `over-engineering`: File/export ratio > 20x
- `buzzword-inflation`: Claims without evidence
- `shotgun-surgery`: Files frequently change together

## Error Handling

- **Git not available**: Skip git-dependent checks
- **Invalid scope**: Return error in JSON
- **Parse errors**: Skip file, continue scan

## Integration

This skill is invoked by the deslop-analyzer agent.
The command uses it via: `Skill: deslop-detection`
