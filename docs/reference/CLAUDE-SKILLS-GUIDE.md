# Claude Platform Skills: Best Practices Guide

> Comprehensive reference for Agent Skills across Claude.ai, Claude Code, and API

## Overview

Agent Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks. Skills teach Claude how to complete specific tasks repeatably - from document creation to data analysis workflows.

**Key insight**: Skills work through **progressive disclosure** - Claude loads information in stages as needed, rather than consuming context upfront.

## Skills Across Platforms

| Platform | Pre-built Skills | Custom Skills | Sharing Scope |
|----------|-----------------|---------------|---------------|
| **Claude.ai** | Yes (pptx, xlsx, docx, pdf) | Upload ZIP in Settings | Individual user only |
| **Claude Code** | No | Filesystem-based directories | Personal/Project/Plugin |
| **Claude API** | Yes (same as claude.ai) | Upload via Skills API | Workspace-wide |
| **Agent SDK** | No | Filesystem in `.claude/skills/` | Per-agent configuration |

### Platform-Specific Differences

**Claude.ai**:
- Requires code execution to be enabled
- Skills uploaded as ZIP files
- No org-wide admin distribution for custom skills
- Network access varies by user/admin settings

**Claude Code** extends the standard with:
- `disable-model-invocation` - only user can invoke
- `user-invocable: false` - only Claude can invoke
- `context: fork` - run in isolated subagent
- `!`command`` - dynamic context injection
- Automatic nested directory discovery

**Claude API**:
- No network access in containers
- No runtime package installation
- Pre-installed packages only
- Version pinning recommended for production

## Skill Structure

### Minimum Required

```
skill-name/
└── SKILL.md
```

### Full Structure

```
skill-name/
├── SKILL.md           # Required: main instructions
├── REFERENCE.md       # Optional: detailed docs
├── EXAMPLES.md        # Optional: usage patterns
├── scripts/
│   └── helper.py      # Optional: executable code
├── assets/
│   └── template.json  # Optional: static resources
└── references/
    └── api-docs.md    # Optional: domain docs
```

### SKILL.md Format

```yaml
---
name: skill-name
description: What this skill does and when to use it. Be specific.
---

# Skill Name

## Instructions
[Clear, step-by-step guidance]

## Examples
[Concrete input/output examples]
```

### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars, lowercase letters/numbers/hyphens only |
| `description` | Yes | Max 1024 chars, must describe what AND when |
| `license` | No | License name or reference to LICENSE file |
| `compatibility` | No | Max 500 chars, environment requirements |
| `metadata` | No | Arbitrary key-value pairs |
| `allowed-tools` | No | Space-delimited pre-approved tools |

**Claude Code additional fields**:
- `disable-model-invocation` - Block automatic invocation
- `user-invocable` - Show/hide from `/` menu
- `context` - Set to `fork` for subagent execution
- `agent` - Subagent type when `context: fork`
- `argument-hint` - Autocomplete hint
- `model` - Override model for this skill
- `hooks` - Skill-scoped lifecycle hooks

## Context Efficiency

### Progressive Disclosure Levels

| Level | When Loaded | Token Cost | Content |
|-------|-------------|------------|---------|
| **1: Metadata** | Always at startup | ~100 tokens | `name` + `description` only |
| **2: Instructions** | When skill triggers | <5k tokens | SKILL.md body |
| **3: Resources** | As needed | Unlimited | Scripts executed, files read on-demand |

### Token Budget Guidelines

- Keep `SKILL.md` body **under 500 lines**
- Move detailed reference to separate files
- Scripts are **executed, not loaded** - output only
- Claude Code default: 15,000 chars for all skill descriptions

### Conciseness Principles

**Default assumption**: Claude is already very smart. Only add context Claude doesn't already have.

**Bad** (~150 tokens):
```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available...
```

**Good** (~50 tokens):
```markdown
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

## Best Practices

### 1. Write Effective Descriptions

The `description` is critical - Claude uses it to decide when to invoke your skill.

**Good**:
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Bad**:
```yaml
description: Helps with documents
```

**Rules**:
- Always write in **third person** (not "I can help you...")
- Include both **what** it does AND **when** to use it
- Include **specific keywords** users might say

### 2. Set Appropriate Freedom Levels

**High freedom** (text instructions) - when multiple approaches are valid:
```markdown
## Code review process
1. Analyze the code structure
2. Check for potential bugs
3. Suggest improvements
```

**Low freedom** (specific scripts) - when precision matters:
```markdown
## Database migration
Run exactly this script:
```bash
python scripts/migrate.py --verify --backup
```
Do not modify the command.
```

### 3. Use File References Wisely

Keep references **one level deep** from SKILL.md:

**Good**:
```markdown
# SKILL.md
**Basic usage**: [instructions here]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
```

**Bad** (nested references):
```markdown
# SKILL.md
See [advanced.md](advanced.md)...

# advanced.md
See [details.md](details.md)...  # Claude may only preview this
```

### 4. Provide Utility Scripts

Pre-made scripts are more reliable than generated code:

```markdown
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF

```bash
python scripts/analyze_form.py input.pdf > fields.json
```
```

Scripts execute via bash - code never enters context, only output.

### 5. Implement Feedback Loops

For quality-critical tasks, validate before executing:

```markdown
## Document editing process

1. Make your edits to the XML
2. **Validate immediately**: `python scripts/validate.py`
3. If validation fails:
   - Review the error message
   - Fix the issues
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild the document
```

### 6. Test Across Models

Skills act as additions to models. Test with:
- **Haiku**: Does the skill provide enough guidance?
- **Sonnet**: Is the skill clear and efficient?
- **Opus**: Does the skill avoid over-explaining?

## Anti-Patterns to Avoid

### Time-Sensitive Information

**Bad**:
```markdown
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**Good**:
```markdown
## Current method
Use the v2 API endpoint.

## Old patterns (deprecated 2025-08)
<details>
<summary>Legacy v1 API</summary>
The v1 endpoint is no longer supported.
</details>
```

### Inconsistent Terminology

**Bad**: Mix "API endpoint", "URL", "API route", "path"

**Good**: Always use "API endpoint"

### Too Many Options

**Bad**: "You can use pypdf, or pdfplumber, or PyMuPDF, or..."

**Good**: "Use pdfplumber. For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

### Windows-Style Paths

**Always** use forward slashes:
- Good: `scripts/helper.py`
- Bad: `scripts\helper.py`

## Skills vs Other Capabilities

| Feature | When to Use | Scope |
|---------|-------------|-------|
| **Skills** | Task-specific workflows, load on-demand | Dynamic, any conversation |
| **Projects** | Static background knowledge | Always loaded in project chats |
| **MCP** | External service connections | Tool access, not procedures |
| **Custom Instructions** | Broad preferences | All conversations |
| **CLAUDE.md** | Project-specific context | Project scope |

## Security Considerations

- Use skills only from **trusted sources**
- **Audit thoroughly**: Review all bundled files
- Don't hardcode **sensitive information** (API keys, passwords)
- Skills with external URL fetching are **high risk**
- Treat like installing software

## Open Standard

Agent Skills follow the [agentskills.io](https://agentskills.io) open standard. Skills you create work across:

- Claude.ai, Claude Code, Claude API
- OpenCode, Cursor, Amp, Gemini CLI
- GitHub, VS Code, Roo Code
- Goose, Letta, Factory, and 20+ more

## Checklist for Effective Skills

### Core Quality
- [ ] Description includes what AND when
- [ ] SKILL.md under 500 lines
- [ ] Additional details in separate files
- [ ] No time-sensitive information
- [ ] Consistent terminology
- [ ] Examples are concrete
- [ ] File references one level deep

### Code and Scripts
- [ ] Scripts handle errors explicitly
- [ ] No magic constants (all values justified)
- [ ] Required packages documented
- [ ] No Windows-style paths

### Testing
- [ ] Tested with Haiku, Sonnet, Opus
- [ ] Tested with real usage scenarios
- [ ] At least 3 evaluation scenarios

## Quick Reference

### Create a Skill (Claude Code)

```bash
mkdir -p ~/.claude/skills/my-skill
cat > ~/.claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What it does and when to use it.
---

Your instructions here.
EOF
```

### Upload a Skill (API)

```python
from anthropic import Anthropic
from anthropic.lib import files_from_dir

client = Anthropic()
skill = client.beta.skills.create(
    display_title="My Skill",
    files=files_from_dir("/path/to/skill"),
    betas=["skills-2025-10-02"]
)
```

### Use in Messages (API)

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [
            {"type": "anthropic", "skill_id": "pptx", "version": "latest"},
            {"type": "custom", "skill_id": skill.id, "version": "latest"}
        ]
    },
    messages=[{"role": "user", "content": "Create a presentation"}],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}]
)
```

## Resources

- [Agent Skills Spec](https://agentskills.io/specification)
- [Example Skills](https://github.com/anthropics/skills)
- [Skills Cookbook](https://platform.claude.com/cookbook/skills-notebooks-01-skills-introduction)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [API Skills Guide](https://docs.claude.com/en/build-with-claude/skills-guide)
