# Changelog (v3.x Archive)

> This is an archive of v3.x changelog entries. For current changes, see [CHANGELOG.md](../CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.9.0] - 2026-02-04

### Fixed
- **Prompt Analyzer False Positives** - Reduced false positives from 175 to 0 across 81 prompt files
  - `json_without_schema`: Detects JSON in JS code blocks, excludes CLI flags (`--output json`)
  - `missing_context_why`: Recognizes inline explanations (dashes, parentheses, "for X" phrases)
  - `critical_info_buried`: Skips SKILL.md with workflow phases, files with Critical Rules section
  - `missing_instruction_priority`: Detects numbered rules, precedence language, case-sensitive MUST
  - `missing_verification_criteria`: Skips agent-delegating commands, adds perf indicators
  - Added design decision documentation for threshold rationale
  - 23 new test cases covering all pattern changes
- **Agent Count Documentation** - Fixed file-based agent count in docs/reference/AGENTS.md (30→29)

## [3.9.0-rc.6] - 2026-02-04

### Added
- **Agent Skills Open Standard Compliance** - Automated validation for skill/agent structure
  - New `checklists/new-skill.md` documenting Agent Skills Open Standard requirements
  - New `validate:agent-skill-compliance` script added to CI pipeline
  - 106 new tests in `agent-skill-compliance.test.js`
  - Pre-push hook now validates compliance when agents/skills are modified

### Fixed
- **Skill Directory Names** - Renamed 21 skill directories to match their skill names per Agent Skills Open Standard
  - PERF plugin: 9 directories (e.g., `analyzer` -> `perf-analyzer`)
  - ENHANCE plugin: 10 directories (e.g., `prompts` -> `enhance-prompts`)
  - NEXT-TASK plugin: 2 directories (`task-discovery` -> `discover-tasks`, `delivery-validation` -> `validate-delivery`)
- **Missing Skill Tool** - Added `Skill` tool to 7 agents that invoke skills
  - next-task: delivery-validator, task-discoverer
  - perf: perf-analyzer, perf-code-paths, perf-investigation-logger, perf-theory-gatherer, perf-theory-tester

## [3.9.0-rc.2] - 2026-02-04

### Added
- **Cross-File Enhancer Integration** - Cross-file analyzer now runs as part of /enhance
  - New `cross-file-enhancer` agent (sonnet model)
  - New `enhance-cross-file` skill with 8 detection patterns
  - Orchestrator updated to run cross-file analysis in parallel with other enhancers
  - Focus flag: `--focus=cross-file` to run only cross-file analysis

### Fixed
- **AGENTS.md Model Consistency** - Fixed hooks-enhancer and skills-enhancer model (sonnet->opus)
- **Documentation Counts** - Updated to 39 agents, 25 skills

## [3.9.0-rc.1] - 2026-02-04

### Added
- **Cross-File Semantic Analysis** - Multi-file consistency checking for /enhance (#171)
  - `analyzeToolConsistency()` - Detect tools used but not declared in frontmatter
  - `analyzeWorkflowCompleteness()` - Verify referenced agents exist
  - `analyzePromptConsistency()` - Find duplicate/contradictory rules across agents
  - `analyzeSkillAlignment()` - Check skill allowed-tools match actual usage
  - Platform-aware tool loading (Claude Code, OpenCode, Codex)
  - Optional `tools.json` config for custom tool lists
  - O(n) keyword indexing for contradiction detection
  - Path traversal and ReDoS prevention
- **Prompt Code Validation** - AST-based analysis for code blocks in prompts (#169)
  - `extractCodeBlocks()` utility for parsing fenced code blocks with language tags
  - `invalid_json_in_code_block` pattern: Validates JSON syntax (HIGH certainty)
  - `invalid_js_syntax` pattern: Validates JavaScript syntax (MEDIUM certainty)
  - `code_language_mismatch` pattern: Detects language tag mismatches (MEDIUM certainty)
  - `heading_hierarchy_gaps` pattern: Detects skipped heading levels (HIGH certainty)
  - New `code-validation` category in enhance reports
  - Skips validation inside `<bad-example>` tags to avoid false positives
  - Performance: <100ms per file (pre-compiled regex patterns, size limits)
- **Comprehensive Test Coverage** - 164 new tests for cross-file and prompt analyzers
  - False positive prevention tests (prose context, markdown links, bad-example variants)
  - False negative prevention tests (tool detection, syntax validation)
  - Performance tests (100KB content, 200 agent refs, caching behavior)
  - Edge case tests (Unicode, nesting, path traversal)
  - Real codebase integration tests

### Fixed
- **Bad-example Tag Consistency** - `<bad_example>` with underscore now supported in cross-file-analyzer (was only supporting hyphen/space variants)
- **Fix Function Alignment** - `fixAggressiveEmphasis()` now fixes all words detected by pattern (added ABSOLUTELY, TOTALLY, EXTREMELY, DEFINITELY, COMPLETELY, ENTIRELY, FORBIDDEN, URGENT)

## [3.8.2] - 2026-02-04

### Fixed
- **Policy Questions Enforcement** - /next-task Phase 1 now explicitly requires all 3 policy questions (Source, Priority, Stop Point) with table and forbidden actions
- **Codex CLI Installer** - Fixed undefined `configPath` variable (should be `configDir`)

### Changed
- **XML Tag Consistency** - All 12 workflow phases now wrapped in consistent `<phase-N>` tags
- **Constructive Language** - Replaced "you are wrong" with guidance pointing to consequences table
- **Redundancy Reduction** - Consolidated duplicate forbidden actions lists

## [3.8.1] - 2026-02-04

### Fixed
- **Stop Point Options** - Restored missing "Deployed" and "Production" options in OpenCode embedded policy
- **Phase 9 Review Loop** - Rewrote instructions to explicitly require spawning 4 parallel reviewer agents (code-quality, security, performance, test-coverage) instead of single generic reviewer
- **Agent Naming Consistency** - Standardized all references from legacy `deslop-work` to `deslop:deslop-agent` across 12 files (docs, configs, agent prompts)

## [3.8.0] - 2026-02-02

### Added
- **sync-docs Repo-Map Integration** - AST-based symbol detection for documentation drift
  - Uses repo-map when available for ~95% accuracy (vs ~30% regex)
  - Auto-initializes repo-map if ast-grep installed
  - New `undocumented-export` issue type for exports missing from docs
  - Graceful fallback to regex when repo-map unavailable
  - New helpers: `ensureRepoMap()`, `getExportsFromRepoMap()`, `findUndocumentedExports()`
- **Version Bump Tool** - `npm run bump <version>` to update all version files

### Fixed
- **OpenCode Config Path** - Use correct `~/.config/opencode/` path (not `~/.opencode/`)
- **OpenCode Plugin TypeError** - Handle `input.agent` as object or string in chat.params hook
- **OpenCode Command Transform** - Policy section only added to next-task command (not all commands)
- **CI Validation** - Restored agent count detail for delivery validation

### Changed
- **sync-docs Skill** - Updated with proper agent instructions and tool restrictions
- **Documentation** - Optimized CLAUDE.md for token efficiency

## [3.7.2] - 2026-02-01

### Fixed
- **OpenCode Compatibility** - Comprehensive fixes for OpenCode integration
  - Fixed subagent invocation documentation (@ mention syntax, not Task tool)
  - Fixed code block transformation for all blocks (with/without language identifier)
  - Fixed plugin prefix stripping in agent references
  - Fixed skill name format (drift-analysis lowercase-hyphenated)
  - Fixed skill installation location documentation (~/.config/opencode/skills/)
  - Removed stale MCP server references from all documentation
  - Removed MCP configuration from adapter install scripts

### Changed
- **Documentation Updates**
  - Updated OPENCODE-REFERENCE.md with correct paths and installation details
  - Updated ARCHITECTURE.md to remove MCP server section
  - Updated CROSS_PLATFORM.md with OpenCode agent/skill locations
  - Updated release checklist to remove MCP version references
  - Removed update-mcp.md checklist reference from CLAUDE.md and AGENTS.md

### Removed
- **MCP Server Cleanup** - Removed all references to deleted MCP server
  - marketplace.json mcpServer section removed
  - adapter install.sh MCP configuration sections removed
  - .npmignore mcp-server exclusions removed

## [3.7.2-rc.4] - 2026-02-01

### Fixed
- **OpenCode Lib Files** - Copy lib/ directory to commands folder
  - Commands can now require() lib modules (policy-questions, workflow-state, etc.)
  - Added copyDirRecursive helper for recursive directory copy

## [3.7.2-rc.3] - 2026-02-01

### Fixed
- **OpenCode Agent Name Prefix** - Strip plugin prefix from agent references
  - `next-task:task-discoverer` -> `task-discoverer`
  - `deslop:deslop-agent` -> `deslop-agent`
  - Agents are installed without prefix, commands must match
  - Updated OpenCode note to list available agent names

## [3.7.2-rc.2] - 2026-02-01

### Fixed
- **OpenCode Command Transformation** - Commands now properly transform for OpenCode
  - JavaScript code blocks converted to OpenCode instructions
  - Task tool calls converted to @ mention syntax (`@agent-name`)
  - Added OpenCode note to complex commands explaining @ mention usage
  - workflowState references converted to phase instructions

## [3.7.2-rc.1] - 2026-02-01

### Fixed
- **OpenCode Subagent Invocation** - Fixed incorrect documentation stating subagents use Task tool
  - OpenCode uses @ mention syntax (`@agent-name prompt`), not Task tool
  - Updated `agent-docs/OPENCODE-REFERENCE.md` with correct invocation patterns
  - Added section documenting @ mention syntax for subagents

### Added
- **OpenCode Compatibility Tests** - New test suite for cross-platform validation
  - `__tests__/opencode-compatibility.test.js` - 13 tests covering:
    - Documentation accuracy (no Task tool references for OpenCode)
    - Label length compliance (30-char limit)
    - Cross-platform state handling
    - Plugin and installer validation
- **OpenCode Migration Tool** - Script to set up native OpenCode agents
  - `scripts/migrate-opencode.js` - Creates `.opencode/agents/` definitions
  - Validates label lengths and identifies Task tool usage
  - Integrated into OpenCode installer

### Changed
- **OpenCode Installer** - Now runs migration tool during installation

## [3.7.1] - 2026-02-01

### Security
- **Command Injection Prevention** - Converted `execSync` to `execFileSync` with argument arrays
  - `lib/collectors/docs-patterns.js` - Added `isValidGitRef()` validation
  - `lib/repo-map/updater.js` - Added `isValidCommitHash()` validation
  - `lib/repo-map/installer.js` - Safe command execution with argument arrays
  - `lib/enhance/auto-suppression.js` - Git remote command
  - `lib/patterns/slop-analyzers.js` - Git log command
  - `lib/perf/checkpoint.js` - Git status/log commands
  - `lib/repo-map/runner.js` - Git rev-parse commands

### Removed
- **MCP Server** - Removed unused MCP (Model Context Protocol) server component
  - Deleted `mcp-server/` directory
  - Removed MCP configuration from OpenCode and Codex installers
  - Removed `docs/reference/MCP-TOOLS.md` and `checklists/update-mcp.md`
  - Removed MCP validation from cross-platform checks

### Changed
- **Atomic File Writes** - All state files now use atomic write pattern (write to temp, then rename)
  - `lib/state/workflow-state.js` - tasks.json, flow.json
  - `lib/repo-map/cache.js` - repo-map.json
  - `lib/perf/investigation-state.js` - investigation state
  - `lib/sources/source-cache.js` - source preferences
- **Optimistic Locking** - Added version-based concurrency control for read-modify-write operations
  - `lib/state/workflow-state.js` - updateFlow() with retry on conflict
  - `lib/perf/investigation-state.js` - updateInvestigation() with retry on conflict
- **Async File Reading** - Converted synchronous file reads to async batches in repo-map fullScan
  - Added `batchReadFiles()` helper with configurable concurrency
  - Pre-loads file contents asynchronously before processing
- **Error Logging** - Added error logging to catch blocks in `lib/patterns/pipeline.js`
- **Cache Efficiency** - Optimized `lib/utils/cache-manager.js` to skip iterator creation when not evicting
- **Deep Clone** - Replaced `JSON.parse(JSON.stringify())` with `structuredClone()` in workflow-state.js and fixer.js
- **Safer CLI Checks** - Replaced `execSync` with `execFileSync` in cli-enhancers.js for version checks
- **Pipeline Timeout** - Added timeout option to `runPipeline()` with phase boundary checks (default: 5 minutes)
- **Config Size Limit** - Added 1MB file size limit to enhance suppression config loading
- **Git Log Buffer** - Reduced maxBuffer for git log from 10MB to 2MB in shotgun surgery analyzer
- **parseInt Radix** - Added explicit radix parameter (10) to all parseInt calls in validate-counts.js and fixer.js
- **Empty Catch Blocks** - Added error logging to empty catch block in fixer.js cleanupBackups()

### Fixed
- **Performance** - Fixed quadratic complexity in `analyzeInfrastructureWithoutImplementation()` by caching file contents

### Added
- **New Utility** - `lib/utils/atomic-write.js` for crash-safe file operations
- **Test Coverage** - Added 51 tests for `lib/utils/shell-escape.js` security module
- **Test Coverage** - Added 11 tests for `lib/utils/atomic-write.js`
- **Test Coverage** - Added 36 tests for `lib/schemas/validator.js`
- **Test Coverage** - Added 37 tests for `lib/enhance/suppression.js`
- **Test Coverage** - Added 29 tests for `lib/repo-map/installer.js` (version checks, detection)
- **Test Coverage** - Added 15 tests for `lib/repo-map/updater.js` (incremental updates, staleness)
- **Test Coverage** - Added 99 tests for `lib/cross-platform/index.js` (platform detection, state dirs, MCP config)
- **Test Coverage** - Added 76 tests for `lib/repo-map/queries.js` (AST query patterns, language detection)
- **Test Coverage** - Added 37 tests for `lib/sources/source-cache.js` (preference caching, platform paths)
- **Test Coverage** - Expanded `lib/platform/state-dir.js` tests to 24 (priority order, edge cases)
- **Test Coverage** - Expanded `lib/utils/atomic-write.js` tests to 41 (concurrency, unicode, large files)
- **Test Coverage** - Expanded `lib/patterns/pipeline.js` tests to 72 (timeout, filtering, aggregation)
- **Test Coverage** - Expanded `lib/collectors/docs-patterns.js` tests to 69 (edge cases, coverage)
- **Test Coverage** - Added 72 tests for enhancement analyzers (plugin/agent patterns, severity classification)

### Fixed
- **Error Handling** - Added graceful degradation to platform detection and tool verification
  - `lib/platform/verify-tools.js` - Try-catch with fallback to unavailable status
  - `lib/platform/detect-platform.js` - Individual .catch() handlers with sensible defaults
  - `lib/perf/benchmark-runner.js` - Meaningful error context for subprocess failures
- **Async CLI** - Fixed `plugins/deslop/scripts/detect.js` to properly await async `runPipeline()`

## [3.7.0] - 2026-02-01

### Added
- **Repo-Map Usage Analyzer** - New analyzer for tracking repo-map usage patterns across workflows
- **Shared Collectors** - Consolidated data collection utilities for repo-map and drift detection

### Changed
- **sync-docs Consolidation** - Refactored to single skill, single agent, single command architecture (#161)
- **agent-docs Library** - Consolidated knowledge base, removed duplications for cleaner maintainability (#160)
- **CLI Improvements** - Enhanced installer output and dev-install plugin registration

### Fixed
- **Deslop False Positives** - Reduced false positives by 77% (444 → 101 findings)
  - Disabled noisy patterns: `magic_numbers`, `bare_urls`, `process_exit`, `file_path_references`, `speculative_generality_unused_params`
  - Refined `console_debugging` to only flag `console.log|debug` (not warn/error)
  - Added global exclusions for pattern definition files
- **Security: Shell Injection** - Replaced `execSync` with `spawnSync` in docs-patterns.js to prevent command injection via malicious filenames
- **Performance: Doc Caching** - Re-introduced documentation file caching to avoid redundant disk reads
- **Skill Paths** - Updated all skills to use relative paths per Agent Skills spec for cross-platform compatibility
- **Pre-push Hook** - Added `ENHANCE_CONFIRMED=1` env var support for non-interactive contexts
- **Plugin Install Failure** - Removed invalid `agents` and `skills` fields from deslop and sync-docs plugin.json manifests that caused schema validation errors
- **Deslop Large Repo Crash** - Prevented crash when running deslop on repositories with many files
- **gh pr checks Field** - Corrected state field usage (was using `conclusion`, now using `state`)
- **Windows CLI Gotchas** - Added documentation for `$` escaping and single quote issues
- **CLAUDE.md --no-verify Rule** - Added rule to never skip git hooks

## [3.6.1] - 2026-01-31

### Added
- **Workflow Verification Gates** - Mandatory checkpoints in SubagentStop hook
  - Gate 1: Worktree must exist before exploration (prevents `git checkout -b` shortcuts)
  - Gate 2: Review loop must complete with 1+ iterations before delivery
  - Gate 3: All PR comments must be addressed before merge
- **No Shortcuts Policy** - Explicit enforcement rules in /next-task and /ship commands
  - Decision tree for agent transitions
  - Forbidden actions list with consequences

### Changed
- **Prompt Enhancement** - Reduced aggressive emphasis (CAPS, !!) in workflow commands for cleaner prompts
  - next-task.md: 58 → 0 aggressive emphasis instances
  - ship.md: 88 → 0 aggressive emphasis instances
  - ship-ci-review-loop.md: 63 → 0 aggressive emphasis instances
- **XML Structure Tags** - Added semantic XML tags for better prompt parsing
  - `<no-shortcuts-policy>`, `<workflow-gates>`, `<phase-3>`, `<phase-9>`, `<ship-handoff>`
  - hooks.json: `<subagent-stop-hook>`, `<verification-gates>`, `<decision-tree>`, `<enforcement>`
- **Tone Normalization** - Consistent lowercase for rules while maintaining clarity
  - "MUST" → "must", "FORBIDDEN" → "Forbidden", "NEVER" → "Do not"

## [3.6.0-rc.1] - 2026-01-30

### Added
- **Meta-Skill: maintain-cross-platform** - Comprehensive knowledge base for repo maintainers covering 3-platform architecture, validation suite, release process, and automation opportunities (1,024 lines)
- **Validation Suite** - 6 comprehensive validators running in CI and pre-push hook
  - `validate:counts` - Doc accuracy (agents, plugins, skills, versions, CLAUDE.md↔AGENTS.md alignment)
  - `validate:paths` - Hardcoded path detection with smart context-aware filtering
  - `validate:platform-docs` - Cross-platform docs consistency validation
- **Pre-Push Hook Enhancement** - 3-phase validation: validation suite, /enhance enforcement, release tag checks
- **Skills: validate-delivery and update-docs** - New skills extracted from agents for reusability

### Changed
- **Agent-to-Skill Refactoring** - Moved implementation from agents to skills following Command→Agent→Skill pattern
  - delivery-validator: 467 lines → 109 (agent) + 157 (skill) = cleaner separation
  - docs-updater: 513 lines → 103 (agent) + 162 (skill) = better modularity
  - worktree-manager: Streamlined for clarity
- **All 10 Enhance Skills** - Complete knowledge embedded with workflows, patterns, examples
  - orchestrator, reporter, agent-prompts, claude-memory, docs, plugins, prompts, hooks, skills
  - Each includes: Critical Rules, Detection Patterns, Output Format, Success Criteria
- **Documentation** - Aligned agent counts across all docs (39 total = 29 file-based + 10 role-based)
- **AGENTS.md Created** - 100% aligned with CLAUDE.md for cross-platform compatibility

### Fixed
- **Cross-Platform Compatibility** - Hardcoded `.claude/flow.json` paths replaced with `${stateDir}/flow.json`
- **Documentation Accuracy** - Plugin count (8→9), agent count (29→39) aligned across README, CLAUDE.md, docs
- **Pre-Push Validation** - Now runs full validation suite automatically before every push

### Infrastructure
- Validation suite prevents regressions: hardcoded paths, count mismatches, version drift, doc conflicts
- Pre-push hook enforces CLAUDE.md Critical Rule #7 (/enhance on modified enhanced content)
- All 1400+ tests passing, all validators passing

## [3.5.0] - 2026-01-30

### Added
- **/enhance Auto-Learning Suppression** - Smart false positive detection reduces noise over time (#154)
  - New lib/enhance/auto-suppression.js: Pattern-specific heuristics with 0.90+ confidence threshold
  - Automatically saves obvious false positives for future runs (up to 100 per project)
  - New flags: --show-suppressed, --no-learn, --reset-learned, --export-learned
  - Pattern heuristics: vague_instructions (pattern docs), aggressive_emphasis (workflow gates), missing_examples (orchestrators)
  - Cross-platform storage with 6-month expiry
  - Backward compatible with manual suppression.js

- **Pattern Validation Benchmarks** - Manifest-driven testing system for enhance module pattern accuracy (#157)
  - New lib/enhance/benchmark.js: runPatternBenchmarks, runFixBenchmarks, generateReport, assertThresholds
  - Precision/recall/F1 metrics for pattern detection quality
  - True-positive, false-positive, and fix-pair fixture support
  - CI-ready threshold assertions for regression prevention

## [3.4.0] - 2026-01-29

### Added
- **Repo-map perf script** - Reusable benchmark runner for repo-map creation

### Changed
- **/perf benchmarking** - Added oneshot mode plus multi-run aggregation with duration/runs controls

### Removed
- **Repo-map docs analysis** - Dropped documentation scanning and legacy docs fields from repo-map output

## [3.4.0-rc.1] - 2026-01-29

### Added
- **/perf Plugin** - Structured performance investigations with baselines, profiling, hypotheses, and evidence-backed decisions
- **/perf Command** - Phase-based workflow for baselining, breaking points, constraints, profiling, and consolidation
- **/perf Skills & Agents** - Baseline, benchmark, profiling, theory testing, code paths, and investigation logging
- **/enhance Hooks Analyzer** - New hook checks for frontmatter completeness and safety cues
- **/enhance Skills Analyzer** - New SKILL.md checks for frontmatter and trigger phrase clarity
- **Enhance MCP Tool** - `enhance_analyze` now supports `hooks` and `skills` focus targets

### Changed
- **Enhance Orchestrator** - Expanded to run hooks/skills analyzers alongside existing enhancers
- **Docs** - Expanded /perf usage, requirements, and architecture references

### Fixed
- **/perf Path Safety** - Validate investigation ids and baseline versions to prevent path traversal
- **/perf Optimization Runner** - Explicit warm-up before experiment capture

## [3.3.2] - 2026-01-29

### Fixed
- **sync-docs Plugin Manifest** - Removed invalid `commands` field that caused "Invalid input" validation error during plugin installation
- **/ship Hook Response** - Added JSON response at workflow completion for SubagentStop hook compatibility

## [3.3.0] - 2026-01-28

### Changed
- **Docs** - Documented `npm run detect`/`npm run verify` diagnostics scripts for platform/tool checks
- **Docs** - Clarified Phase 9 review loop uses the `orchestrate-review` skill for pass definitions
- **Docs** - Aligned `/drift-detect` naming and expanded repo-map usage details
- **Docs** - Recommended installing ast-grep (`sg`) upfront for repo-map

## [3.2.1] - 2026-01-28

### Added
- **Repo Map Plugin** - AST-based repository map generation using ast-grep with incremental updates and cached symbol/import maps
- **/repo-map Command** - Initialize, update, and check status of repo maps (with optional docs analysis)
- **repo_map MCP Tool** - Cross-platform repo-map generation via MCP
- **map-validator Agent** - Lightweight validation of repo-map output
- **orchestrate-review Skill** - New skill providing review pass definitions, signal detection patterns, and iteration algorithms for Phase 9 review loop
- **Release Tag Hook** - Pre-push hook blocks version tag pushes until validation passes (npm test, npm run validate, npm pack)

### Changed
- **/ship** - Automatically updates repo-map after merge when a map exists
- **/drift-detect** - Suggests repo-map init/update when missing or stale
- **Workflow Agents** - Exploration, planning, and implementation agents check for repo-map if available
- **Phase 9 Review Loop** - Now uses orchestrate-review skill with parallel Task agents instead of nested review-orchestrator agent
  - Resolves Claude Code nested subagent limitations
  - Spawns parallel reviewers (code-quality, security, performance, test-coverage + conditional specialists)
  - Scope-based specialist selection: user request, workflow, or project audit
- **Agent Count** - Reduced from 32 to 31 agents (removed review-orchestrator)

### Removed
- **review-orchestrator Agent** - Replaced by orchestrate-review skill for better cross-platform compatibility

### Fixed
- **MCP SDK Dependency** - Added @modelcontextprotocol/sdk as dev dependency for MCP server tests

## [3.1.0] - 2026-01-26

### Added
- **Queue-Based Review Loop** - Multi-pass review with resume support, stall detection, and decision-gate overrides
- **CI Consistency Validation** - Repository validator for version/mapping/agent-count alignment (`npm run validate`)
- **Pre-Release Channels** - `rc`/`beta` tag support for npm dist-tags and GitHub prereleases

### Fixed
- **MCP Path Scoping** - MCP tools now reject paths outside the repo (custom tasks, review_code, slop_detect)
- **MCP Responsiveness** - Review and slop pipelines run in a worker thread with sync fallback
- **Slop Pipeline IO** - Cached file reads reduce repeated disk access

### Changed
- **Complexity Analysis** - Caps escomplex runs to reduce process spawn overhead
- **GitHub Actions** - Actions pinned to commit SHAs for supply-chain hardening

## [3.0.3-rc.1] - 2026-01-26

### Added
- **Queue-Based Review Loop** - Multi-pass review with resume support, stall detection, and decision gate overrides in /next-task and /audit-project
- **CI Consistency Validation** - New repository validator for version/mapping/agent-count alignment in `npm run validate`
- **Pre-Release Channels** - `rc`/`beta` tag support for npm dist-tags and GitHub prereleases

### Changed
- **Review Passes** - Integrated security/performance/test coverage passes and conditional specialists for audit/review workflows
## [3.0.2] - 2025-01-24

### Fixed
- **Slop Detection Windows Paths** - `isFileExcluded()` now normalizes backslashes to forward slashes, fixing pattern matching on Windows (e.g., `bin/**` now correctly excludes `bin\cli.js`)

## [3.0.1] - 2025-01-24

### Fixed
- **Windows Path Handling** - Fixed `require()` statements breaking on Windows due to unescaped backslashes in `CLAUDE_PLUGIN_ROOT` paths
  - All 21 require() calls now normalize paths with `.replace(/\\/g, '/')`
  - Added `normalizePathForRequire()` helper to lib/cross-platform/
  - Updated checklists with Windows-safe require() pattern

- **Slop Detection False Positives** - Reduced false positive rate from 95% to <10%
  - `placeholder_text`: Only matches actual placeholder content in comments/strings
  - `magic_numbers`: Focus on 2-3 digit business logic, extensive file exclusions
  - `console_debugging`: Excludes scripts/, e2e/, seeds, test infrastructure
  - `hardcoded_secrets`: Excludes test/mock prefixes and fixture files
  - `process_exit`: Excludes scripts/, prisma/, migrations, seeds
  - `disabled_linter`: Lowered severity (many are justified)

### Removed
- **feature_envy pattern** - 100% false positive rate, requires AST analysis. Use `eslint-plugin-clean-code` instead.
- **message_chains_methods pattern** - Flags idiomatic fluent APIs (Zod, query builders). Use `eslint-plugin-smells` instead.
- **message_chains_properties pattern** - Same issue with deep config/object access.

## [3.0.0] - 2025-01-24

### Breaking Changes - Command Renames
All command names have been simplified for clarity:

| Old Command | New Command | Reason |
|-------------|-------------|--------|
| `/deslop-around` | `/deslop` | "-around" suffix unnecessary |
| `/update-docs-around` | `/sync-docs` | Clearer, describes the action |
| `/reality-check:scan` | `/drift-detect` | Describes what it finds |
| `/project-review` | `/audit-project` | Indicates deep analysis |

**Migration:**
- Update any scripts or aliases referencing old command names
- Plugin directories renamed accordingly
- All documentation updated to reflect new names

### Added
- **Standalone /sync-docs Command** - New plugin for documentation sync outside main workflow
  - Finds docs that reference changed files (imports, filenames, paths)
  - Checks for outdated imports, removed exports, version mismatches
  - Identifies commits that may need CHANGELOG entries
  - Two modes: `report` (default, safe) and `apply` (auto-fix safe issues)
  - Scope options: `--recent` (default), `--all`, or specific path
  - Works standalone or integrated with `/next-task` workflow

### Changed
- **Plugin directory structure** - Renamed to match new command names:
  - `plugins/deslop-around/` → `plugins/deslop/`
  - `plugins/update-docs-around/` → `plugins/sync-docs/`
  - `plugins/reality-check/` → `plugins/drift-detect/`
  - `plugins/project-review/` → `plugins/audit-project/`
- **Library directory** - `lib/reality-check/` → `lib/drift-detect/`

