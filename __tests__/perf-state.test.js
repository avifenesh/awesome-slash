const fs = require('fs');
const os = require('os');
const path = require('path');

const stateDir = require('../lib/platform/state-dir');
const investigationState = require('../lib/perf/investigation-state');

describe('perf investigation state', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-state-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates and reads investigation state', () => {
    const state = investigationState.initializeInvestigation({
      scenario: 'API latency spike'
    }, tempDir);

    const readBack = investigationState.readInvestigation(tempDir);
    expect(readBack).not.toBeNull();
    expect(readBack.id).toBe(state.id);
    expect(readBack.scenario.description).toBe('API latency spike');
  });

  it('appends investigation log entries', () => {
    const state = investigationState.initializeInvestigation({}, tempDir);
    investigationState.appendInvestigationLog(state.id, 'Entry 1', tempDir);
    investigationState.appendInvestigationLog(state.id, 'Entry 2', tempDir);

    const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
    const contents = fs.readFileSync(logPath, 'utf8');
    expect(contents).toContain('Entry 1');
    expect(contents).toContain('Entry 2');
  });

  it('rejects invalid investigation ids', () => {
    expect(() => investigationState.getInvestigationLogPath('../bad-id', tempDir)).toThrow();
  });

  it('appends baseline log entries', () => {
    const state = investigationState.initializeInvestigation({
      scenarios: [
        { name: 'low', params: { concurrency: 10 } },
        { name: 'high', params: { concurrency: 200 } }
      ]
    }, tempDir);
    const baselinePath = path.join(tempDir, '.ai-state', 'perf', 'baselines', 'v1.0.0.json');

    investigationState.appendBaselineLog({
      id: state.id,
      userQuote: 'Baseline the API latency.',
      command: 'npm run bench',
      metrics: { latency_ms: 120 },
      baselinePath,
      scenarios: state.scenario.scenarios
    }, tempDir);

    const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
    const contents = fs.readFileSync(logPath, 'utf8');
    expect(contents).toContain('Baseline -');
    expect(contents).toContain('Baseline the API latency.');
    expect(contents).toContain('npm run bench');
    expect(contents).toContain('latency_ms');
    expect(contents).toContain(baselinePath);
  });

  it('appends profiling log entries', () => {
    const state = investigationState.initializeInvestigation({}, tempDir);
    investigationState.appendProfilingLog({
      id: state.id,
      userQuote: 'Profile the hot path.',
      tool: 'jfr',
      command: 'java -XX:StartFlightRecording=duration=60s,filename=profile.jfr',
      artifacts: ['profile.jfr'],
      hotspots: ['src/App.java:42']
    }, tempDir);

    const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
    const contents = fs.readFileSync(logPath, 'utf8');
    expect(contents).toContain('Profiling -');
    expect(contents).toContain('jfr');
    expect(contents).toContain('profile.jfr');
  });

  it('appends decision log entries', () => {
    const state = investigationState.initializeInvestigation({}, tempDir);
    investigationState.appendDecisionLog({
      id: state.id,
      userQuote: 'Stop if improvement is negligible.',
      verdict: 'stop',
      rationale: 'No measurable improvement after 3 experiments.'
    }, tempDir);

    const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
    const contents = fs.readFileSync(logPath, 'utf8');
    expect(contents).toContain('Decision -');
    expect(contents).toContain('Verdict: stop');
    expect(contents).toContain('No measurable improvement');
  });
});
