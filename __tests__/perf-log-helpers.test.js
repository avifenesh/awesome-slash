const fs = require('fs');
const os = require('os');
const path = require('path');

const investigationState = require('../lib/perf/investigation-state');
const stateDir = require('../lib/platform/state-dir');

describe('perf log helpers', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-logs-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('appends setup, breaking-point, constraints, hypotheses, code-paths, optimization logs', () => {
    const state = investigationState.initializeInvestigation({
      scenario: 'Test scenario'
    }, tempDir);

    investigationState.appendSetupLog({
      id: state.id,
      userQuote: 'Run perf setup.',
      scenario: 'Test scenario',
      command: 'npm run bench',
      version: 'v1.0.0'
    }, tempDir);

    investigationState.appendBreakingPointLog({
      id: state.id,
      userQuote: 'Find breaking point.',
      paramEnv: 'PERF_PARAM_VALUE',
      min: 1,
      max: 10,
      breakingPoint: 6
    }, tempDir);

    investigationState.appendConstraintLog({
      id: state.id,
      userQuote: 'Test constraints.',
      constraints: { cpu: '1', memory: '1GB' },
      delta: { metrics: { latency_ms: { delta: 10 } } }
    }, tempDir);

    investigationState.appendHypothesesLog({
      id: state.id,
      userQuote: 'Generate hypotheses.',
      hypotheses: [
        { id: 'H1', hypothesis: 'N+1 queries', evidence: 'src/db.js', confidence: 'medium' }
      ]
    }, tempDir);

    investigationState.appendCodePathsLog({
      id: state.id,
      userQuote: 'Map code paths.',
      keywords: ['auth', 'session'],
      paths: [
        { file: 'src/auth/index.js', score: 2, symbols: ['login', 'logout'] }
      ]
    }, tempDir);

    investigationState.appendOptimizationLog({
      id: state.id,
      userQuote: 'Try optimization.',
      change: 'reduce allocations',
      delta: { metrics: { latency_ms: { delta: -5 } } },
      verdict: 'inconclusive'
    }, tempDir);

    const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
    const contents = fs.readFileSync(logPath, 'utf8');
    expect(contents).toContain('Setup -');
    expect(contents).toContain('Breaking Point -');
    expect(contents).toContain('Constraints -');
    expect(contents).toContain('Hypotheses -');
    expect(contents).toContain('Code Paths -');
    expect(contents).toContain('Optimization -');
  });
});
