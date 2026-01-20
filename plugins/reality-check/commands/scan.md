---
description: Deep repository analysis to realign project plans with actual code reality
argument-hint: "[--sources github,docs,code] [--depth quick|thorough] [--output file|display|both] [--file PATH]"
allowed-tools: Bash(git:*), Bash(gh:*), Read, Glob, Grep, Task, Write
---

# /reality-check:scan - Reality Check Scanner

Perform deep repository analysis to identify drift between documented plans and actual implementation.

## Architecture

```
scan.md → collectors.js (pure JS) → plan-synthesizer (Opus) → report
          ├─ scanGitHubState()      (single call with full context)
          ├─ analyzeDocumentation()
          └─ scanCodebase()
```

Data collection is pure JavaScript (no LLM). Only semantic analysis uses Opus.

## Arguments

Parse from $ARGUMENTS:
- `--sources`: Comma-separated list of sources to scan (default: github,docs,code)
- `--depth`: Scan depth - quick or thorough (default: thorough)
- `--output`: Output mode - file, display, or both (default: both)
- `--file`: Output file path (default: reality-check-report.md)

Example: `/reality-check:scan --sources github,docs --depth quick --output file`

## Phase 1: Parse Arguments and Collect Data

```javascript
const collectors = require('${CLAUDE_PLUGIN_ROOT}/lib/reality-check/collectors.js');

// Parse arguments
const args = '$ARGUMENTS'.split(' ').filter(Boolean);
const options = {
  sources: ['github', 'docs', 'code'],
  depth: 'thorough',
  output: 'both',
  file: 'reality-check-report.md',
  cwd: process.cwd()
};

// Parse flags
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sources' && args[i+1]) {
    options.sources = args[++i].split(',').map(s => s.trim());
  } else if (args[i] === '--depth' && args[i+1]) {
    options.depth = args[++i];
  } else if (args[i] === '--output' && args[i+1]) {
    options.output = args[++i];
  } else if (args[i] === '--file' && args[i+1]) {
    options.file = args[++i];
  }
}

console.log(`
## Starting Reality Check Scan

**Sources**: ${options.sources.join(', ')}
**Depth**: ${options.depth}
**Output**: ${options.output}

Collecting data...
`);

// Collect all data using pure JavaScript (no LLM)
const collectedData = await collectors.collectAllData(options);

// Check if GitHub data collection succeeded
if (options.sources.includes('github') && collectedData.github && !collectedData.github.available) {
  console.log(`
⚠️ GitHub CLI not available or not authenticated.
Run \`gh auth login\` to enable GitHub issue scanning.
Continuing with other sources...
  `);
}

console.log(`
### Data Collection Complete

${collectedData.github?.available ? `- **GitHub**: ${collectedData.github.issues.length} issues, ${collectedData.github.prs.length} PRs` : '- **GitHub**: Not available'}
${collectedData.docs ? `- **Documentation**: ${Object.keys(collectedData.docs.files).length} files analyzed` : '- **Documentation**: Skipped'}
${collectedData.code ? `- **Code**: ${Object.keys(collectedData.code.structure).length} directories scanned` : '- **Code**: Skipped'}

→ Sending to semantic analyzer...
`);
```

## Phase 2: Semantic Analysis (Single Opus Call)

Send all collected data to plan-synthesizer for deep semantic analysis:

```javascript
const analysisPrompt = `
You are analyzing a project to identify drift between documented plans and actual implementation.

## Collected Data

### GitHub State
\`\`\`json
${JSON.stringify(collectedData.github, null, 2)}
\`\`\`

### Documentation Analysis
\`\`\`json
${JSON.stringify(collectedData.docs, null, 2)}
\`\`\`

### Codebase Analysis
\`\`\`json
${JSON.stringify(collectedData.code, null, 2)}
\`\`\`

## Your Task

Perform deep semantic analysis to:

1. **Identify Drift**: Where do documented plans diverge from actual implementation?
   - Features documented but not implemented
   - Features implemented but not documented
   - Milestones/phases marked complete but actually incomplete
   - Stale issues that should be closed or updated

2. **Find Critical Gaps**: What's missing that blocks progress?
   - Missing tests for implemented features
   - Missing documentation for public APIs
   - Incomplete implementations
   - Blocking issues

3. **Cross-Reference**: Connect related items across sources
   - Issues that relate to undocumented features
   - Code patterns that indicate incomplete work
   - Documentation that contradicts code behavior

4. **Prioritize**: Create an actionable reconstruction plan
   - Critical: Blocks other work, security issues
   - High: Missing functionality, broken features
   - Medium: Documentation gaps, tech debt
   - Low: Nice-to-haves, polish

Output a detailed markdown report with:
- Executive Summary
- Drift Analysis (with specific examples)
- Gap Analysis (with severity ratings)
- Cross-Reference Findings
- Prioritized Reconstruction Plan
`;

await Task({
  subagent_type: "reality-check:plan-synthesizer",
  prompt: analysisPrompt,
  description: "Analyze project reality"
});
```

## Phase 3: Output Report

After the synthesizer completes, the report is available. Handle output per settings:

```javascript
// The synthesizer outputs the report directly
// Handle file writing if requested

if (options.output === 'file' || options.output === 'both') {
  console.log(`\n---\nReport saved to: ${options.file}`);
}

console.log(`
## Reality Check Complete

Use the findings above to realign your project with reality.
Run \`/reality-check:scan --depth quick\` for faster subsequent scans.
`);
```

## Quick Reference

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| --sources | github,docs,code | all three | Which sources to scan |
| --depth | quick, thorough | thorough | How deep to analyze |
| --output | file, display, both | both | Where to output results |
| --file | path | reality-check-report.md | Output file path |

## Success Criteria

- Data collected via pure JavaScript (no LLM overhead)
- Single Opus call for semantic analysis with full context
- Drift and gaps clearly identified with examples
- Prioritized reconstruction plan produced
- Report output per user settings

Begin scan now.
