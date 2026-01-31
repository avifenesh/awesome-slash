---
name: changelog-update
description: "Use when managing CHANGELOG entries. Check for undocumented commits, format and apply new entries safely."
version: 1.0.0
argument-hint: "check | apply <commits-json> | format <entry-json>"
---

# changelog-update

Manage CHANGELOG.md updates for the repository.

## Input

Arguments: `check | apply <commits-json> | format <entry-json>`

### Commands

- **check**: Scan for undocumented commits
- **apply**: Add entries to CHANGELOG
- **format**: Format a single entry (dry-run)

## Check Mode

Scan recent commits and identify those missing from CHANGELOG.

```bash
# Get commits since last CHANGELOG update
git log --oneline --since="$(git log -1 --format=%ci CHANGELOG.md)" --no-merges
```

### Categorization

Commits are categorized by conventional commit prefix:

| Prefix | Category | CHANGELOG Section |
|--------|----------|-------------------|
| `feat:` | Feature | Added |
| `fix:` | Bug Fix | Fixed |
| `perf:` | Performance | Changed |
| `docs:` | Documentation | (skip) |
| `chore:` | Chore | (skip) |
| `refactor:` | Refactor | Changed |
| `breaking:` | Breaking | Breaking Changes |

### Output Format

```json
{
  "changelogPath": "CHANGELOG.md",
  "lastUpdateDate": "2024-01-15",
  "undocumented": [
    {
      "sha": "abc1234",
      "message": "feat: add user authentication",
      "category": "Added",
      "date": "2024-01-20"
    },
    {
      "sha": "def5678",
      "message": "fix: resolve memory leak in cache",
      "category": "Fixed",
      "date": "2024-01-18"
    }
  ],
  "documented": 12,
  "status": "needs-update"
}
```

## Apply Mode

Add new entries to CHANGELOG.md.

### Input

```json
[
  {
    "sha": "abc1234",
    "message": "feat: add user authentication",
    "category": "Added"
  }
]
```

### Process

1. Parse existing CHANGELOG structure
2. Find or create section for current version
3. Add entries under appropriate categories
4. Preserve existing formatting

```javascript
function applyEntries(changelogPath, entries) {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const parsed = parseChangelog(content);

  // Find unreleased section or create one
  let unreleased = parsed.sections.find(s => s.title === 'Unreleased');
  if (!unreleased) {
    unreleased = createUnreleasedSection();
    parsed.sections.unshift(unreleased);
  }

  // Add entries by category
  for (const entry of entries) {
    const category = unreleased.categories[entry.category] || [];
    category.push(formatEntry(entry));
    unreleased.categories[entry.category] = category;
  }

  return formatChangelog(parsed);
}
```

### Entry Format

```markdown
## [Unreleased]

### Added
- Add user authentication ([abc1234])

### Fixed
- Resolve memory leak in cache ([def5678])
```

## Format Mode

Preview how an entry would be formatted.

### Input

```json
{
  "sha": "abc1234",
  "message": "feat: add user authentication",
  "category": "Added",
  "description": "Optional longer description"
}
```

### Output

```markdown
- Add user authentication ([abc1234])
```

## CHANGELOG Parsing

Supports common CHANGELOG formats:

### Keep a Changelog Format

```markdown
# Changelog

## [Unreleased]

## [1.2.0] - 2024-01-15
### Added
- Feature X

### Fixed
- Bug Y
```

### Simple Format

```markdown
# CHANGELOG

## v1.2.0

- Added: Feature X
- Fixed: Bug Y
```

## Safety Rules

1. Never delete existing entries
2. Preserve existing formatting style
3. Add entries to appropriate sections only
4. Create backup before modifications
5. Validate markdown structure after changes

## Error Handling

| Error | Behavior |
|-------|----------|
| No CHANGELOG found | Report, suggest creation |
| Parse failure | Report, skip modifications |
| Git not available | Exit with error |
| No undocumented commits | Report "ok", no changes |

## Integration

Called by docs-analyzer for check:

```
Skill: changelog-update
Args: check
```

Called by docs-validator for apply:

```
Skill: changelog-update
Args: apply [{"sha":"abc","message":"feat: new feature","category":"Added"}]
```

## Output (Check Mode)

```json
{
  "status": "ok|needs-update",
  "undocumented": [],
  "entriesNeeded": 0,
  "lastUpdated": "2024-01-15"
}
```

## Output (Apply Mode)

```json
{
  "applied": [
    {"sha": "abc1234", "category": "Added", "formatted": "- Add feature X"}
  ],
  "changelogPath": "CHANGELOG.md",
  "sectionsModified": ["Unreleased"],
  "backupCreated": "CHANGELOG.md.bak"
}
```
