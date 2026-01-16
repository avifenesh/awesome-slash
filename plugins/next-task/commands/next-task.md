---
description: Master workflow orchestrator with autonomous task-to-production automation
argument-hint: "[filter] [--status] [--resume] [--abort] [--implement]"
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(node:*), Read, Write, Edit, Glob, Grep, Task, AskUserQuestion
---

# /next-task - Master Workflow Orchestrator

Discover what to work on next and execute the complete implementation workflow.

## Workflow Overview

```
Policy Selection → Task Discovery → Worktree Setup → Exploration → Planning
       ↓                                                              ↓
   (User input)                                              (User approval)
                                                                      ↓
                    ← ← ← AUTONOMOUS FROM HERE → → →
                                                                      ↓
Implementation → Pre-Review Gates → Review Loop → Delivery Validation
                                                                      ↓
                                                        Docs Update → /ship
```

**Human interaction points (ONLY THESE):**
1. Policy selection via checkboxes
2. Task selection from ranked list
3. Plan approval (EnterPlanMode/ExitPlanMode)

**After plan approval, everything runs autonomously until delivery validation passes.**

## ⛔ WORKFLOW ENFORCEMENT - CRITICAL

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         MANDATORY WORKFLOW GATES                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Each phase MUST complete and approve before the next can start:         ║
║                                                                          ║
║  1. implementation-agent completes                                       ║
║           ↓ MUST trigger                                                 ║
║  2. deslop-work + test-coverage-checker (parallel)                       ║
║           ↓ MUST trigger                                                 ║
║  3. review-orchestrator (MUST approve - all critical/high resolved)      ║
║           ↓ MUST trigger (only if approved)                              ║
║  4. delivery-validator (MUST approve - tests pass, build passes)         ║
║           ↓ MUST trigger (only if approved)                              ║
║  5. docs-updater                                                         ║
║           ↓ MUST EXPLICITLY invoke /ship (NOT rely on hooks alone)       ║
║  6. /ship command (creates PR, monitors CI, merges, CLEANS UP)           ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ⛔ NO AGENT may create a PR - only /ship creates PRs                    ║
║  ⛔ NO AGENT may push to remote - only /ship pushes                      ║
║  ⛔ NO AGENT may skip the review-orchestrator                            ║
║  ⛔ NO AGENT may skip the delivery-validator                             ║
║  ⛔ NO AGENT may skip the docs-updater                                   ║
║  ⛔ NO AGENT may skip workflow-status.json updates after each phase      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## ⚠️ MANDATORY STATE UPDATES - EVERY AGENT

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    EVERY AGENT MUST UPDATE STATE                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  After EACH phase completion, agents MUST:                               ║
║                                                                          ║
║  1. Update .claude/workflow-status.json in the WORKTREE with:            ║
║     - Current step name and status                                       ║
║     - Timestamp of completion                                            ║
║     - Any relevant result data                                           ║
║                                                                          ║
║  2. Update .claude/tasks.json in the MAIN REPO with:                     ║
║     - lastActivityAt timestamp                                           ║
║     - Current status                                                     ║
║                                                                          ║
║  FAILURE TO UPDATE STATE = WORKFLOW CANNOT RESUME                        ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### State Update Code (Use in EVERY agent)

```javascript
// MANDATORY: Call this at the END of every agent's work
function recordStepCompletion(stepName, result = {}) {
  const fs = require('fs');
  const path = require('path');

  // 1. Update worktree's workflow-status.json
  const worktreeStatusPath = '.claude/workflow-status.json';
  if (fs.existsSync(worktreeStatusPath)) {
    const status = JSON.parse(fs.readFileSync(worktreeStatusPath, 'utf8'));

    status.steps.push({
      step: stepName,
      status: 'completed',
      startedAt: status.workflow.lastActivityAt,
      completedAt: new Date().toISOString(),
      result: result
    });

    status.workflow.lastActivityAt = new Date().toISOString();
    status.workflow.currentPhase = stepName;
    status.resume.resumeFromStep = stepName;

    fs.writeFileSync(worktreeStatusPath, JSON.stringify(status, null, 2));
    console.log(`✓ Updated workflow-status.json: ${stepName}`);
  }

  // 2. Update main repo's tasks.json (if accessible)
  const mainRepoTasksPath = status?.git?.mainRepoPath
    ? path.join(status.git.mainRepoPath, '.claude', 'tasks.json')
    : null;

  if (mainRepoTasksPath && fs.existsSync(mainRepoTasksPath)) {
    const registry = JSON.parse(fs.readFileSync(mainRepoTasksPath, 'utf8'));
    const taskIdx = registry.tasks.findIndex(t => t.id === status.task.id);

    if (taskIdx >= 0) {
      registry.tasks[taskIdx].lastActivityAt = new Date().toISOString();
      registry.tasks[taskIdx].currentStep = stepName;
      fs.writeFileSync(mainRepoTasksPath, JSON.stringify(registry, null, 2));
      console.log(`✓ Updated tasks.json registry: ${stepName}`);
    }
  }
}
```

### SubagentStop Hook Enforcement

The `hooks/hooks.json` SubagentStop hook enforces this sequence. When any agent
completes, the hook determines and triggers the next mandatory phase. Agents
MUST NOT invoke subsequent phases themselves - they STOP and let the hook handle it.

## Arguments

Parse from $ARGUMENTS:
- `--status`: Show current workflow state and exit
- `--resume [task/branch/worktree]`: Continue from last checkpoint
- `--abort`: Cancel workflow and cleanup
- `--implement`: Skip to implementation after task selection
- `[filter]`: Task filter (bug, feature, security, test)

### Resume Syntax

```
/next-task --resume                     # Resume active worktree (if only one)
/next-task --resume 123                 # Resume by task ID
/next-task --resume feature/my-task-123 # Resume by branch name
/next-task --resume ../worktrees/my-task-123  # Resume by worktree path
```

### ⚠️ EXISTING SESSION vs STALE SESSION - IMPORTANT

```
╔══════════════════════════════════════════════════════════════════════════╗
║              UNDERSTANDING "EXISTING SESSION" SEMANTICS                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  "Existing session" means AN ACTIVE AGENT IS CURRENTLY RUNNING:          ║
║                                                                          ║
║  ✓ An agent is in the middle of processing                               ║
║  ✓ The workflow was interrupted (context limit, crash, user cancel)      ║
║  ✓ workflow-status.json shows recent lastActivityAt (< 1 hour)           ║
║                                                                          ║
║  This is DIFFERENT from a "stale session":                               ║
║                                                                          ║
║  ✗ Worktree exists but no agent is running                               ║
║  ✗ lastActivityAt is old (> 24 hours)                                    ║
║  ✗ User abandoned the task without cleanup                               ║
║                                                                          ║
║  BEHAVIOR:                                                               ║
║  - Existing session: --resume continues from last checkpoint             ║
║  - Stale session: Ask user - resume or abort/cleanup?                    ║
║  - No session: Start fresh workflow                                      ║
║                                                                          ║
║  CHECK BEFORE STARTING NEW WORKFLOW:                                     ║
║  1. Read .claude/tasks.json in main repo                                 ║
║  2. If tasks exist, check lastActivityAt for each                        ║
║  3. Recent activity (< 1 hour) = active session, DO NOT start new        ║
║  4. Old activity (> 24 hours) = stale, ask user                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## Pre-flight: Handle Arguments

```javascript
const workflowState = require('${CLAUDE_PLUGIN_ROOT}/lib/state/workflow-state.js');
const args = '$ARGUMENTS'.split(' ').filter(Boolean);

// Handle --status
if (args.includes('--status')) {
  const summary = workflowState.getWorkflowSummary();
  if (!summary) { console.log("No active workflow."); return; }
  console.log(`## Status: ${summary.status} | Phase: ${summary.currentPhase} | Task: ${summary.task?.title || 'None'}`);
  return;
}

// Handle --abort
if (args.includes('--abort')) {
  workflowState.abortWorkflow('User requested abort');
  console.log("✓ Workflow aborted.");
  return;
}

// Handle --resume
if (args.includes('--resume')) {
  const resumeArg = args[args.indexOf('--resume') + 1];
  const worktree = await findWorktreeToResume(resumeArg);

  if (!worktree) {
    console.log("No worktree found to resume. Specify task ID, branch, or worktree path.");
    return;
  }

  // Read workflow-status.json from the worktree
  const statusPath = path.join(worktree.path, '.claude', 'workflow-status.json');
  if (!fs.existsSync(statusPath)) {
    console.log(`No workflow-status.json found in ${worktree.path}`);
    return;
  }

  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  const lastStep = status.steps[status.steps.length - 1];

  console.log(`
## Resuming Workflow

**Task**: #${status.task.id} - ${status.task.title}
**Worktree**: ${worktree.path}
**Branch**: ${status.git.branch}
**Last Step**: ${lastStep.step} (${lastStep.status})
**Last Activity**: ${status.workflow.lastActivityAt}
  `);

  // Change to worktree
  process.chdir(worktree.path);

  // Determine resume phase from last completed step
  const resumePhase = mapStepToPhase(lastStep.step);
  console.log(`Resuming from phase: ${resumePhase}`);

  // Continue workflow from that phase...
}

async function findWorktreeToResume(arg) {
  const registryPath = '.claude/tasks.json';
  if (!fs.existsSync(registryPath)) return null;

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  // No argument - if only one active task, use it
  if (!arg && registry.tasks.length === 1) {
    return { path: registry.tasks[0].worktreePath, task: registry.tasks[0] };
  }

  // Search by task ID
  const byId = registry.tasks.find(t => t.id === arg);
  if (byId) return { path: byId.worktreePath, task: byId };

  // Search by branch name
  const byBranch = registry.tasks.find(t => t.branch === arg || t.branch.endsWith(arg));
  if (byBranch) return { path: byBranch.worktreePath, task: byBranch };

  // Direct path
  if (arg && fs.existsSync(arg)) {
    return { path: arg, task: null };
  }

  return null;
}

function mapStepToPhase(step) {
  const stepToPhase = {
    'worktree-created': 'exploration',
    'exploration-completed': 'planning',
    'plan-approved': 'implementation',
    'implementation-completed': 'pre-review-gates',
    'deslop-work-completed': 'review-loop',
    'review-approved': 'delivery-validation',
    'delivery-validation-passed': 'docs-update',
    'docs-updated': 'ship',
    'ready-to-ship': 'ship'
  };
  return stepToPhase[step] || 'exploration';
}
```

## Phase 1: Policy Selection

→ **Agent**: `next-task:policy-selector` (haiku)

```javascript
workflowState.startPhase('policy-selection');

await Task({
  subagent_type: "next-task:policy-selector",
  prompt: `Configure workflow via checkbox selection. Gather: task source, priority filter, stopping point.`
});

// Policy now in state
```

## Phase 2: Task Discovery

→ **Agent**: `next-task:task-discoverer` (inherit)

```javascript
workflowState.startPhase('task-discovery');

await Task({
  subagent_type: "next-task:task-discoverer",
  prompt: `Discover tasks from ${policy.taskSource}, filter by ${policy.priorityFilter}. Present top 5 to user for selection.`
});

// Selected task now in state.task
```

## Phase 3: Worktree Setup

→ **Agent**: `next-task:worktree-manager` (haiku)

```javascript
workflowState.startPhase('worktree-setup');

await Task({
  subagent_type: "next-task:worktree-manager",
  prompt: `Create worktree for task #${state.task.id} - ${state.task.title}. Anchor pwd to worktree.`
});

// All subsequent operations happen in worktree
```

## Phase 4: Exploration

→ **Agent**: `next-task:exploration-agent` (opus)

```javascript
workflowState.startPhase('exploration');

await Task({
  subagent_type: "next-task:exploration-agent",
  model: "opus",
  prompt: `Deep codebase analysis for task #${state.task.id}. Find key files, patterns, dependencies.`
});

// Exploration results in state for planning
```

## Phase 5: Planning

→ **Agent**: `next-task:planning-agent` (opus)

```javascript
workflowState.startPhase('planning');

await Task({
  subagent_type: "next-task:planning-agent",
  model: "opus",
  prompt: `Design implementation plan for task #${state.task.id}. Enter plan mode for user approval.`
});

// Agent uses EnterPlanMode → user approves → ExitPlanMode
```

## Phase 6: User Approval

Planning agent handles this via EnterPlanMode/ExitPlanMode.
**This is the LAST human interaction point.**

## Phase 7: Implementation

→ **Agent**: `next-task:implementation-agent` (opus)

```javascript
workflowState.startPhase('implementation');

await Task({
  subagent_type: "next-task:implementation-agent",
  model: "opus",
  prompt: `Execute approved plan for task #${state.task.id}. Commit changes incrementally.`
});

// → SubagentStop hook triggers pre-review gates
```

## Phase 8: Pre-Review Gates

→ **Agents** (parallel): `next-task:deslop-work` (sonnet) + `next-task:test-coverage-checker` (sonnet)

Triggered automatically by SubagentStop hook after implementation.

```javascript
workflowState.startPhase('pre-review-gates');

await Promise.all([
  Task({ subagent_type: "next-task:deslop-work", prompt: `Clean AI slop from new work.` }),
  Task({ subagent_type: "next-task:test-coverage-checker", prompt: `Validate test coverage (advisory).` })
]);

// → Proceeds to review loop
```

## Phase 9: Review Loop

→ **Agent**: `next-task:review-orchestrator` (opus)

```javascript
workflowState.startPhase('review-loop');

await Task({
  subagent_type: "next-task:review-orchestrator",
  model: "opus",
  prompt: `Orchestrate multi-agent review. Fix critical/high issues. Max ${policy.maxReviewIterations || 3} iterations.`
});

// Runs deslop-work after each iteration to clean fixes
// → SubagentStop hook triggers delivery validation when approved
```

## Phase 10: Delivery Validation

→ **Agent**: `next-task:delivery-validator` (sonnet)

Triggered automatically by SubagentStop hook after review approval.

```javascript
workflowState.startPhase('delivery-validation');

const result = await Task({
  subagent_type: "next-task:delivery-validator",
  prompt: `Validate task completion. Check: tests pass, build passes, requirements met, no regressions.`
});

if (!result.approved) {
  // Return to implementation with fix instructions - automatic retry
  workflowState.failPhase(result.reason, { fixInstructions: result.fixInstructions });
  return; // Workflow retries from implementation
}

workflowState.completePhase({ deliveryApproved: true });
```

## Phase 11: Docs Update

→ **Agent**: `next-task:docs-updater` (sonnet)

Triggered automatically by SubagentStop hook after delivery validation.

```javascript
workflowState.startPhase('docs-update');

await Task({
  subagent_type: "next-task:docs-updater",
  prompt: `Update docs for changed files. CHANGELOG, API docs, code examples.`
});

workflowState.completePhase({ docsUpdated: true });
```

## ⚠️ EXPLICIT HANDOFF TO /ship - CRITICAL

After docs-updater completes, you MUST EXPLICITLY invoke /ship.
**DO NOT rely on SubagentStop hooks alone** - explicitly call the ship skill.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                      /ship RESPONSIBILITIES                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  /ship handles ALL of the following (agents must NOT do these):          ║
║                                                                          ║
║  1. CREATE PR - Push branch, create pull request                         ║
║  2. MONITOR CI - Wait for checks to pass                                 ║
║  3. MONITOR COMMENTS - Wait for reviews, address all comments            ║
║  4. MERGE PR - Squash/merge based on policy                              ║
║  5. CLEANUP WORKTREE - Remove worktree after merge                       ║
║  6. UPDATE tasks.json - Remove task from registry after completion       ║
║                                                                          ║
║  AGENTS MUST NOT:                                                        ║
║  - Create PRs                                                            ║
║  - Push to remote                                                        ║
║  - Clean up worktrees                                                    ║
║  - Remove tasks from registry                                            ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Required Handoff Code

```javascript
// AFTER docs-updater completes, EXPLICITLY invoke /ship
console.log(`
## ✓ Implementation Complete - Ready to Ship

Task #${state.task.id} passed all validation checks.
- ✓ Review approved (all critical/high resolved)
- ✓ Delivery validated (tests pass, build passes)
- ✓ Documentation updated

→ EXPLICITLY invoking /ship for PR creation and merge workflow.
`);

// Update state BEFORE invoking ship
recordStepCompletion('ready-to-ship', {
  readyAt: new Date().toISOString(),
  taskId: state.task.id
});

// EXPLICIT invocation - DO NOT skip this
await Skill({ skill: "ship:ship", args: "--state-file .claude/workflow-status.json" });
```

### /ship Cleanup Responsibilities

When /ship completes successfully, it MUST:

```javascript
// /ship cleanup (happens inside ship command)
function cleanupAfterShip(state) {
  const fs = require('fs');
  const path = require('path');

  // 1. Remove task from main repo's tasks.json
  const mainRepoTasksPath = path.join(state.git.mainRepoPath, '.claude', 'tasks.json');
  if (fs.existsSync(mainRepoTasksPath)) {
    const registry = JSON.parse(fs.readFileSync(mainRepoTasksPath, 'utf8'));
    registry.tasks = registry.tasks.filter(t => t.id !== state.task.id);
    fs.writeFileSync(mainRepoTasksPath, JSON.stringify(registry, null, 2));
    console.log(`✓ Removed task #${state.task.id} from tasks.json registry`);
  }

  // 2. Return to main repo directory
  process.chdir(state.git.mainRepoPath);

  // 3. Remove worktree
  exec(`git worktree remove "${state.git.worktreePath}" --force`);
  console.log(`✓ Removed worktree at ${state.git.worktreePath}`);

  // 4. Prune worktree references
  exec('git worktree prune');
}
```

## Error Handling

```javascript
try {
  // ... workflow phases ...
} catch (error) {
  workflowState.failPhase(error.message, { phase: currentPhase });
  console.log(`
## Workflow Failed at ${currentPhase}

Use \`/next-task --resume\` to retry from checkpoint.
Use \`/next-task --abort\` to cancel.
  `);
}
```

## State Management Architecture

Two-file state management to prevent collisions across parallel workflows:

### Main Repo: `.claude/tasks.json`
```
- Shared registry of claimed tasks
- task-discoverer reads to exclude claimed tasks
- worktree-manager adds entry when creating worktree
- ship removes entry on cleanup
```

### Worktree: `.claude/workflow-status.json`
```
- Local to each worktree
- Tracks all steps with timestamps
- Used for --resume to find last step
- Isolated from other workflows
```

### Step Recording

Each agent MUST record its step in the worktree's workflow-status.json:

```javascript
function recordStep(stepName, status, result = null) {
  const statusPath = '.claude/workflow-status.json';
  const state = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  state.steps.push({
    step: stepName,
    status: status,
    startedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    result: result
  });

  state.workflow.lastActivityAt = new Date().toISOString();
  state.workflow.currentPhase = stepName;
  state.resume.resumeFromStep = stepName;

  fs.writeFileSync(statusPath, JSON.stringify(state, null, 2));
}
```

## Success Criteria

- Policy selection via checkboxes
- **Two-file state management** (main repo registry + worktree status)
- **Resume by task ID, branch, or worktree path**
- Worktree isolation
- Opus for complex tasks (explore, plan, implement, review)
- Sonnet for validation tasks (quality gates, delivery)
- Haiku for simple tasks (policy, worktree)
- Fully autonomous after plan approval
- SubagentStop hooks for phase transitions
- Handoff to /ship for PR workflow

Begin workflow now.
