---
name: sync-docs-analysis
description: "Use when analyzing doc issues after code changes. Check for outdated references, stale examples, and missing updates."
version: 1.0.0
argument-hint: "<doc-path> <changed-file> [--deep]"
---

# sync-docs-analysis

Analyze documentation for issues related to code changes.

## Input

Arguments: `<doc-path> <changed-file> [--deep]`

- **doc-path**: Path to the documentation file to analyze
- **changed-file**: The source file that changed
- **--deep**: Enable deep analysis (check code examples, verify imports)

## Analysis Types

### 1. Version References

Check if documentation references outdated versions.

```javascript
const { collectors } = require('@awesome-slash/lib');

const issues = collectors.docsPatterns.analyzeDocIssues(docPath, changedFile, {
  checkVersions: true
});
```

Detects:
- Package version mismatches
- API version references
- Changelog version mentions

### 2. Import/Export References

Check if documentation references removed or renamed exports.

```javascript
const exports = collectors.docsPatterns.getExportsFromGit(changedFile);
// Compare with doc content
```

Detects:
- References to removed functions
- Outdated import statements
- Renamed symbols

### 3. Code Examples

Check if code examples still work with current implementation.

```javascript
// Deep mode only
const examples = extractCodeBlocks(docContent);
for (const example of examples) {
  const imports = parseImports(example);
  const valid = validateImports(imports, currentExports);
}
```

Detects:
- Examples using removed APIs
- Examples with wrong import paths
- Examples with outdated patterns

### 4. File Path References

Check if file paths mentioned in docs still exist.

```javascript
const pathRefs = extractFilePaths(docContent);
for (const ref of pathRefs) {
  if (!fs.existsSync(ref)) {
    issues.push({ type: 'missing-file', path: ref });
  }
}
```

## Output Format

```json
{
  "doc": "README.md",
  "referencedFile": "src/utils.js",
  "issues": [
    {
      "type": "outdated-version",
      "line": 15,
      "current": "1.0.0",
      "expected": "1.1.0",
      "certainty": "HIGH",
      "autoFix": true,
      "suggestion": "Update version from 1.0.0 to 1.1.0"
    },
    {
      "type": "removed-export",
      "line": 42,
      "symbol": "legacyFunction",
      "certainty": "HIGH",
      "autoFix": false,
      "suggestion": "Function 'legacyFunction' was removed. Update or remove this reference."
    },
    {
      "type": "stale-example",
      "line": 78,
      "certainty": "MEDIUM",
      "autoFix": false,
      "suggestion": "Code example may be outdated. Verify it works with current API."
    }
  ]
}
```

## Issue Types

| Type | Certainty | Auto-Fix | Description |
|------|-----------|----------|-------------|
| `outdated-version` | HIGH | Yes | Version string doesn't match current |
| `removed-export` | HIGH | No | References removed symbol |
| `renamed-export` | HIGH | Yes | References renamed symbol |
| `import-path` | HIGH | Yes | Import path changed |
| `missing-file` | HIGH | Yes | Referenced file doesn't exist |
| `stale-example` | MEDIUM | No | Code example may be outdated |
| `outdated-pattern` | MEDIUM | No | Uses deprecated patterns |

## Deep Analysis Mode

When `--deep` is enabled:

1. **Parse code blocks** - Extract JavaScript/TypeScript from markdown
2. **Validate imports** - Check if imports resolve
3. **Check patterns** - Detect deprecated usage patterns
4. **Cross-reference** - Match doc claims against actual code

```javascript
// Deep analysis adds these checks
if (deepMode) {
  const codeBlocks = extractCodeBlocks(docContent);
  for (const block of codeBlocks) {
    const ast = parseCode(block.code);
    const imports = extractImports(ast);
    const calls = extractFunctionCalls(ast);

    // Validate against current codebase
    validateAgainstCodebase(imports, calls, repoMap);
  }
}
```

## Performance

- Fast mode: Regex-based pattern matching (~10ms per doc)
- Deep mode: AST parsing of code blocks (~100ms per doc)
- Limits analysis to relevant sections using reference context

## Usage in Workflow

Called by docs-analyzer agent after discovery:

```
Skill: sync-docs-analysis
Args: README.md src/api.js
```

Returns structured issues for the validator to process.
