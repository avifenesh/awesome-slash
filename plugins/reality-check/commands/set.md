---
description: Show available reality-check scan flags
argument-hint: ""
allowed-tools:
---

# /reality-check:set - Scan Configuration Help

Display available flags for configuring `/reality-check:scan`.

## Overview

The reality-check plugin now uses command-line flags instead of persistent settings files. This command shows available options.

## Available Flags

Use these flags with `/reality-check:scan`:

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--sources` | github,docs,code | all three | Which sources to scan |
| `--depth` | quick, thorough | thorough | How deep to analyze |
| `--output` | file, display, both | both | Where to output results |
| `--file` | path | reality-check-report.md | Output file path |

## Examples

**Full scan (default):**
```
/reality-check:scan
```

**Quick GitHub-only scan:**
```
/reality-check:scan --sources github --depth quick
```

**Documentation analysis only:**
```
/reality-check:scan --sources docs --output display
```

**Custom output file:**
```
/reality-check:scan --file reports/reality-2024-01.md
```

**Thorough code and docs analysis:**
```
/reality-check:scan --sources docs,code --depth thorough
```

## Source Details

### `github`
Scans using the `gh` CLI:
- Open issues (categorized by labels)
- Open pull requests
- Milestones and their status
- Stale items (> 90 days inactive)
- Themes from issue titles

**Requires:** `gh` CLI installed and authenticated (`gh auth login`)

### `docs`
Analyzes documentation files:
- README.md, CONTRIBUTING.md, CHANGELOG.md
- PLAN.md, CLAUDE.md
- docs/*.md
- Checkbox completion rates
- Feature lists and planned work

### `code`
Scans the codebase:
- Directory structure
- Framework detection (React, Express, etc.)
- Test framework detection
- Health indicators (tests, linting, CI)
- Implemented features

## Migration from Settings File

If you have an existing `.claude/reality-check.local.md` settings file, it is no longer used. Convert your preferences to flags:

**Old settings file:**
```yaml
sources:
  github_issues: true
  docs_paths: [README.md, docs/]
scan_depth: thorough
output:
  write_to_file: true
```

**New equivalent:**
```
/reality-check:scan --sources github,docs --depth thorough --output file
```

## Run a Scan

Ready to scan? Use:
```
/reality-check:scan
```
