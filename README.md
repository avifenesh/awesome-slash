# Awesome Slash Commands

> Professional-grade slash commands for Claude Code that work across any project

A Claude Code marketplace providing 5 powerful, zero-configuration slash commands for common development workflows. Each command is a separate installable plugin - pick what you need!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/avifenesh/awsome-slash?style=flat&color=yellow)](https://github.com/avifenesh/awsome-slash/stargazers)
[![Claude Code](https://img.shields.io/badge/Claude-Code%20Plugin-blue)](https://code.claude.com/)
[![GitHub issues](https://img.shields.io/github/issues/avifenesh/awsome-slash)](https://github.com/avifenesh/awsome-slash/issues)

## Quick Start

### 1. Add the Marketplace

```bash
claude plugin marketplace add avifenesh/awsome-slash
```

### 2. Install Plugins (Pick What You Need!)

Each command is a separate plugin. Install only what you need:

```bash
# Install individual plugins
claude plugin install deslop-around@awsome-slash      # AI slop cleanup
claude plugin install next-task@awsome-slash          # Task prioritization
claude plugin install project-review@awsome-slash     # Multi-agent code review
claude plugin install ship@awsome-slash               # Complete PR workflow
claude plugin install pr-merge@awsome-slash           # Intelligent PR merge

# Or install all at once
claude plugin install deslop-around@awsome-slash next-task@awsome-slash project-review@awsome-slash ship@awsome-slash pr-merge@awsome-slash
```

Commands are available immediately - no restart needed. Type `/` in Claude Code to see them.

**See [INSTALLATION.md](./INSTALLATION.md) for detailed instructions and troubleshooting.**

## Available Plugins

### 🧹 `/deslop-around` - AI Slop Cleanup

Remove debugging code, old TODOs, and other AI slop from your codebase.

```bash
/deslop-around               # Report mode - analyze only
/deslop-around apply         # Apply fixes with verification
/deslop-around apply src/ 10 # Fix up to 10 issues in src/
```

**Category:** Development
**What it detects:**
- Console debugging (`console.log`, `print()`, `dbg!()`)
- Old TODOs and commented code
- Placeholder text ("lorem ipsum", "test test")
- Empty catch blocks without logging
- Magic numbers and hardcoded URLs
- Disabled linters (eslint-disable, #noqa)
- Trailing whitespace and mixed indentation

**Supports:** Node.js, Python, Rust, Go | Jest, Pytest, Cargo test, Go test

---

### 📋 `/next-task` - Intelligent Task Prioritization

Discover what to work on next with AI-powered task analysis.

```bash
/next-task                   # Get top priority tasks
/next-task bug               # Filter by keyword
/next-task --include-blocked # Include blocked tasks
```

**Category:** Productivity
**What it does:**
- Collects tasks from GitHub Issues, Linear (optional), PLAN.md
- Validates tasks aren't already implemented (checks codebase)
- Scores by impact, urgency, effort, and dependencies
- Provides top 5 recommendations with evidence (file:line references)
- Optionally starts multi-agent implementation workflow

**Requires:** GitHub CLI (`gh`)
**Optional:** Linear integration, PLAN.md file

---

### 🔍 `/project-review` - Multi-Agent Code Review

Comprehensive code review with specialized AI agents that iterate until zero issues remain.

```bash
/project-review              # Full codebase review
/project-review --recent     # Only recent changes
/project-review --domain security # Focus area
```

**Category:** Development
**What it does:**
- Deploys 8 specialized agents (security, performance, architecture, testing, etc.)
- Adapts to your tech stack (React hooks, Django ORM, Rust safety, etc.)
- Finds bugs, security issues, performance problems
- Auto-fixes issues where possible
- Iterates up to 5 rounds until zero critical/high issues
- Tracks tech debt in TECHNICAL_DEBT.md

**Framework Detection:** React, Vue, Angular, Django, FastAPI, Express, Actix, Gin, and more

---

### 🚀 `/ship` - Complete PR Workflow with Deployment

Ship your code from commit to production with full validation.

```bash
/ship                        # Default merge strategy
/ship --strategy rebase      # Rebase before merge
```

**Category:** Deployment
**What it does:**
1. Commits your changes with AI-generated message
2. Creates PR with description and context
3. Waits for CI to pass
4. Runs subagent quality reviews (code, security, tests)
5. Merges to main (or master)
6. Deploys to development (if multi-branch detected)
7. Validates deployment with health checks
8. Deploys to production (if stable branch exists)
9. Validates production deployment
10. Cleans up branches and worktrees
11. Auto-rollback on any failure

**Platform Support:**
- **CI:** GitHub Actions, GitLab CI, CircleCI, Jenkins, Travis CI
- **Deployment:** Railway, Vercel, Netlify, Fly.io, Platform.sh, Render

**Requires:** Git, GitHub CLI (`gh`)

---

### 🔀 `/pr-merge` - Intelligent PR Merge Procedure

Merge PRs with comprehensive validation and deployment testing.

```bash
/pr-merge                    # Merge current branch's PR
/pr-merge 123                # Merge PR #123
/pr-merge 123 --strategy rebase
```

**Category:** Deployment
**What it does:**
1. Addresses all review comments (if not resolved)
2. Runs subagent validation (code quality, security, test coverage)
3. Waits for CI to pass
4. Merges PR to main
5. Tests development environment (if multi-branch)
6. Merges to production (if stable branch exists)
7. Validates production deployment
8. Auto-rollback on deployment failure
9. Cleans up feature branches

**Platform Support:** Same as `/ship`
**Requires:** Git, GitHub CLI (`gh`)

---

## Key Features

- **Zero Configuration** - Auto-detects CI platform, deployment setup, project type, package manager
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Generic by Design** - No hardcoded project names, URLs, or paths
- **Modular Installation** - Install only the plugins you need
- **Context Efficient** - Optimized to minimize token usage (<50k per command)
- **Strong Validation** - Agents provide file:line evidence for all findings
- **Graceful Degradation** - Commands work even when optional tools are missing

## Prerequisites

**Required for all commands:**
- Claude Code CLI
- Git

**Required for PR commands (`/ship`, `/pr-merge`):**
- GitHub CLI (`gh`) with authentication
  ```bash
  # macOS: brew install gh
  # Windows: winget install GitHub.cli
  # Linux: See https://github.com/cli/cli#installation
  # Then: gh auth login
  ```

**Optional (enables additional features):**
- Node.js 18+ (for platform detection scripts)
- Railway CLI (for Railway deployments)
- Vercel CLI (for Vercel deployments)
- Netlify CLI (for Netlify deployments)
- Linear integration (for `/next-task`)

## Platform Support

### Auto-Detected CI Platforms
GitHub Actions · GitLab CI · CircleCI · Jenkins · Travis CI · Generic CI

### Auto-Detected Deployment Platforms
Railway · Vercel · Netlify · Fly.io · Platform.sh · Render · Generic GitHub Actions

### Auto-Detected Project Types
Node.js (npm, pnpm, yarn, bun) · Python (pip, poetry, pipenv) · Rust (cargo) · Go (go mod) · Java (Maven, Gradle)

### Framework-Specific Reviews
**Frontend:** React · Vue · Angular · Svelte
**Backend:** Django · FastAPI · Express · Actix · Gin
**Testing:** Jest · Vitest · Pytest · Cargo test · Go test

## How It Works

All commands use a sophisticated zero-configuration detection system:

1. **Platform Detection** - Scans for CI configs (`.github/workflows/`, `.gitlab-ci.yml`), deployment files (`railway.json`, `vercel.json`), and lockfiles
2. **Tool Verification** - Checks which dev tools are available (`gh`, `railway`, `vercel`, etc.)
3. **Adaptive Execution** - Runs commands appropriate for your setup
4. **Graceful Degradation** - Skips optional features when tools are missing

No configuration files needed - everything is detected automatically!

## Examples

### Ship a feature from commit to production
```bash
# Make your changes
git add .

# In Claude Code:
/ship

# Watch as it:
# ✓ Commits with AI message
# ✓ Creates PR with context
# ✓ Waits for CI (GitHub Actions detected)
# ✓ Reviews code with agents
# ✓ Merges to main
# ✓ Deploys to Railway dev environment
# ✓ Validates deployment
# ✓ Merges to stable
# ✓ Deploys to production
# ✓ Validates production
```

### Find and fix code quality issues
```bash
/project-review

# Iteration 1: Found 12 issues (4 critical, 8 high)
# ✓ Fixed critical SQL injection in auth.py:45
# ✓ Fixed race condition in worker.js:123
# ✓ Fixed missing error handling in api.ts:67
#
# Iteration 2: Found 3 issues (0 critical, 3 high)
# ✓ Fixed all issues
#
# ✓ Zero issues remaining - review complete!
```

### Clean up debugging code
```bash
/deslop-around apply

# Changeset 1/5: Remove console.log statements
# - src/app.js: Removed 3 console.log calls
# ✓ Tests passed
#
# Changeset 2/5: Remove old TODOs (>90 days)
# - src/utils.js: Removed 2 stale TODOs
# ✓ Tests passed
#
# Summary: 5 files changed, 23 lines deleted, 0 lines added
```

### Discover next priority task
```bash
/next-task

# Top 5 Priority Tasks:
#
# 1. [High Impact] Fix login timeout on mobile
#    Score: 9.2/10 (Impact: 10, Urgency: 9, Effort: 3)
#    Status: not-started (no code found)
#    Evidence: No matches in src/auth/** for "mobile timeout"
#    Source: GitHub Issue #234
#
# 2. [Medium Impact] Add password reset flow
#    Score: 7.8/10 (Impact: 8, Urgency: 7, Effort: 5)
#    Status: not-started
#    Evidence: No PasswordReset component found
#    Source: GitHub Issue #189
```

## Documentation

- [Installation Guide](./INSTALLATION.md) - Detailed installation and troubleshooting
- [Usage Examples](./USAGE_EXAMPLES.md) - Real-world usage scenarios
- [Complete Guide](./COMPLETE_GUIDE.md) - Comprehensive documentation
- [Manual Testing](./MANUAL_TESTING.md) - Testing and validation guide
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## Marketplace Structure

This repository serves as a Claude Code plugin marketplace hosting 5 independent plugins:

```
awsome-slash/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest
├── plugins/
│   ├── deslop-around/           # AI slop cleanup plugin
│   ├── next-task/               # Task prioritization plugin
│   ├── project-review/          # Code review plugin
│   ├── ship/                    # PR workflow plugin
│   └── pr-merge/                # PR merge plugin
└── docs/
```

Each plugin contains:
- `.claude-plugin/plugin.json` - Plugin manifest
- `commands/*.md` - Slash command definitions
- `lib/` - Shared detection and pattern libraries

## Roadmap

- [ ] Support for Cursor, Gemini CLI, Codex CLI
- [ ] BitBucket Pipelines support
- [ ] Azure DevOps support
- [ ] AWS CodePipeline support
- [ ] Custom pattern library system
- [ ] Optional plugin configuration file

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [Avi Fenesh](https://github.com/avifenesh)

## Support

- **Issues:** https://github.com/avifenesh/awsome-slash/issues
- **Discussions:** https://github.com/avifenesh/awsome-slash/discussions

## Resources

- [Claude Code Documentation](https://code.claude.com/docs)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)
- [Marketplace Guide](https://code.claude.com/docs/en/plugin-marketplaces)

---

Made with ❤️ for the Claude Code community
