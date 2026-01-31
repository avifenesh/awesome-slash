---
name: sync-docs-discovery
description: "Use when finding docs affected by code changes. Find documentation files related to changed source files using lib/collectors/docs-patterns."
version: 1.0.0
argument-hint: "<changed-files-json>"
---

# sync-docs-discovery

Find documentation related to changed source files.

## Input

Arguments: `<changed-files-json>`

- **changed-files-json**: JSON array of file paths that changed

## Discovery Logic

Uses the shared collectors infrastructure:

```javascript
const { collectors } = require('@awesome-slash/lib');

const result = collectors.docsPatterns.findRelatedDocs(changedFiles, {
  cwd: process.cwd()
});
```

## Reference Types

The discovery process checks for these reference types:

| Type | Pattern | Example |
|------|---------|---------|
| `filename` | Base filename in content | "utils.js" in README |
| `full-path` | Complete path | "src/utils.js" |
| `import` | ES import statement | `from './utils'` |
| `require` | CommonJS require | `require('./utils')` |
| `url-path` | URL path reference | `/api/utils` |

## Output Format

```json
{
  "changedFiles": ["src/utils.js", "lib/api.js"],
  "relatedDocs": [
    {
      "doc": "README.md",
      "referencedFile": "src/utils.js",
      "referenceTypes": ["filename", "import"]
    },
    {
      "doc": "docs/API.md",
      "referencedFile": "lib/api.js",
      "referenceTypes": ["full-path", "url-path"]
    }
  ],
  "markdownFiles": [
    "README.md",
    "CHANGELOG.md",
    "docs/API.md",
    "docs/GUIDE.md"
  ]
}
```

## Performance

- Scans up to 200 markdown files
- Limits directory depth to 5 levels
- Skips node_modules, dist, build, .git

## Usage in Workflow

Called by docs-analyzer agent:

```
Skill: sync-docs-discovery
Args: ["src/utils.js", "lib/api.js"]
```

Returns structured data for the analyzer to process.
