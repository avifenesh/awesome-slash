/**
 * Tests for lib/perf/investigation-state.js
 * Covers: generateInvestigationId, path validation, updateInvestigation,
 * and all append*Log functions
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const stateDir = require('../lib/platform/state-dir');
const investigationState = require('../lib/perf/investigation-state');

describe('investigation-state', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-inv-state-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateInvestigationId', () => {
    it('generates unique IDs with perf prefix', () => {
      const id1 = investigationState.generateInvestigationId();
      const id2 = investigationState.generateInvestigationId();

      expect(id1).toMatch(/^perf-\d{8}-\d{6}-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^perf-\d{8}-\d{6}-[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('initializeInvestigation', () => {
    it('rejects invalid phase', () => {
      expect(() => {
        investigationState.initializeInvestigation({ phase: 'invalid-phase' }, tempDir);
      }).toThrow('Invalid perf phase');
    });

    it('accepts valid phases', () => {
      for (const phase of investigationState.PHASES) {
        const state = investigationState.initializeInvestigation({ phase }, tempDir);
        expect(state.phase).toBe(phase);
      }
    });

    it('initializes with default values', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(state.schemaVersion).toBe(investigationState.SCHEMA_VERSION);
      expect(state.status).toBe('in_progress');
      expect(state.phase).toBe('setup');
      expect(state.baselines).toEqual([]);
      expect(state.hypotheses).toEqual([]);
      expect(state.experiments).toEqual([]);
    });
  });

  describe('updateInvestigation', () => {
    it('merges nested objects', () => {
      investigationState.initializeInvestigation({
        scenario: 'Test scenario'
      }, tempDir);

      const updated = investigationState.updateInvestigation({
        scenario: { metrics: ['latency', 'throughput'] }
      }, tempDir);

      expect(updated.scenario.description).toBe('Test scenario');
      expect(updated.scenario.metrics).toEqual(['latency', 'throughput']);
    });

    it('replaces arrays directly', () => {
      investigationState.initializeInvestigation({}, tempDir);

      const updated = investigationState.updateInvestigation({
        baselines: ['v1.0.0', 'v2.0.0']
      }, tempDir);

      expect(updated.baselines).toEqual(['v1.0.0', 'v2.0.0']);
    });

    it('handles null values', () => {
      investigationState.initializeInvestigation({}, tempDir);

      const updated = investigationState.updateInvestigation({
        decision: null
      }, tempDir);

      expect(updated.decision).toBeNull();
    });

    it('increments version on each update', () => {
      investigationState.initializeInvestigation({}, tempDir);

      const first = investigationState.updateInvestigation({ phase: 'baseline' }, tempDir);
      const second = investigationState.updateInvestigation({ phase: 'profiling' }, tempDir);

      expect(second._version).toBeGreaterThan(first._version);
    });

    it('ignores _version in updates object', () => {
      investigationState.initializeInvestigation({}, tempDir);
      // Read back to get the actual version (writeInvestigation adds _version)
      const afterInit = investigationState.readInvestigation(tempDir);
      const initialVersion = afterInit._version;

      const updated = investigationState.updateInvestigation({
        _version: 999,
        phase: 'baseline'
      }, tempDir);

      // Version should increment by 1, not be set to 999
      expect(updated._version).toBe(initialVersion + 1);
    });
  });

  describe('path validation', () => {
    it('rejects path traversal in investigation id', () => {
      expect(() => {
        investigationState.getInvestigationLogPath('../../../etc/passwd', tempDir);
      }).toThrow('invalid characters');
    });

    it('rejects null bytes in investigation id', () => {
      expect(() => {
        investigationState.getInvestigationLogPath('test\0id', tempDir);
      }).toThrow('invalid characters');
    });

    it('rejects backslash in investigation id', () => {
      expect(() => {
        investigationState.getInvestigationLogPath('test\\id', tempDir);
      }).toThrow('invalid characters');
    });

    it('rejects forward slash in investigation id', () => {
      expect(() => {
        investigationState.getInvestigationLogPath('test/id', tempDir);
      }).toThrow('invalid characters');
    });

    it('accepts valid investigation id characters', () => {
      const logPath = investigationState.getInvestigationLogPath('perf-20250101-120000-abc123', tempDir);
      expect(logPath).toContain('perf-20250101-120000-abc123.md');
    });
  });

  describe('appendSetupLog', () => {
    it('appends setup log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendSetupLog({
        id: state.id,
        userQuote: 'Investigate API slowdown',
        scenario: 'High load test',
        command: 'npm run bench',
        version: 'v1.0.0',
        duration: 60,
        runs: 5,
        aggregate: 'median'
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Setup -');
      expect(contents).toContain('Investigate API slowdown');
      expect(contents).toContain('Scenario: High load test');
      expect(contents).toContain('Command: `npm run bench`');
      expect(contents).toContain('Version: v1.0.0');
      expect(contents).toContain('Duration: 60s');
      expect(contents).toContain('Runs: 5');
      expect(contents).toContain('Aggregate: median');
    });

    it('throws on missing required fields', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendSetupLog({
          id: state.id,
          userQuote: 'Test'
        }, tempDir);
      }).toThrow('requires a scenario');
    });

    it('throws on non-object input', () => {
      expect(() => {
        investigationState.appendSetupLog(null, tempDir);
      }).toThrow('requires an input object');
    });
  });

  describe('appendBreakingPointLog', () => {
    it('appends breaking point log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendBreakingPointLog({
        id: state.id,
        userQuote: 'Find where it breaks',
        paramEnv: 'CONCURRENCY',
        min: 10,
        max: 1000,
        breakingPoint: 450,
        history: [{ value: 500, pass: true }, { value: 750, pass: false }]
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Breaking Point -');
      expect(contents).toContain('Find where it breaks');
      expect(contents).toContain('Param env: CONCURRENCY');
      expect(contents).toContain('Range: 10..1000');
      expect(contents).toContain('Breaking point: 450');
      expect(contents).toContain('History:');
    });

    it('handles null breaking point', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendBreakingPointLog({
        id: state.id,
        userQuote: 'Find limit',
        paramEnv: 'THREADS',
        min: 1,
        max: 100,
        breakingPoint: null
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('Breaking point: n/a');
    });

    it('throws on non-numeric min/max', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendBreakingPointLog({
          id: state.id,
          userQuote: 'Test',
          paramEnv: 'X',
          min: 'low',
          max: 'high'
        }, tempDir);
      }).toThrow('numeric min/max');
    });
  });

  describe('appendConstraintLog', () => {
    it('appends constraint log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendConstraintLog({
        id: state.id,
        userQuote: 'Test under resource limits',
        constraints: { cpu: '50%', memory: '512MB' },
        delta: { metrics: { latency: 15 } }
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Constraints -');
      expect(contents).toContain('Test under resource limits');
      expect(contents).toContain('CPU: 50%');
      expect(contents).toContain('Memory: 512MB');
      expect(contents).toContain('Delta:');
    });

    it('throws on missing constraints', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendConstraintLog({
          id: state.id,
          userQuote: 'Test',
          delta: { metrics: {} }
        }, tempDir);
      }).toThrow('requires constraints');
    });

    it('throws on missing delta', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendConstraintLog({
          id: state.id,
          userQuote: 'Test',
          constraints: { cpu: '50%' }
        }, tempDir);
      }).toThrow('requires delta');
    });
  });

  describe('appendHypothesesLog', () => {
    it('appends hypotheses log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendHypothesesLog({
        id: state.id,
        userQuote: 'What could cause the slowdown?',
        hypotheses: [
          { id: 'H1', hypothesis: 'Database query N+1', confidence: 'high', evidence: 'slow queries in logs' },
          { id: 'H2', hypothesis: 'Memory leak', confidence: 'medium' }
        ],
        gitHistory: ['abc123 Fix query', 'def456 Add cache']
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Hypotheses -');
      expect(contents).toContain('What could cause the slowdown?');
      expect(contents).toContain('H1: Database query N+1');
      expect(contents).toContain('[high]');
      expect(contents).toContain('(evidence: slow queries in logs)');
      expect(contents).toContain('Git history:');
    });

    it('handles empty hypotheses array', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendHypothesesLog({
        id: state.id,
        userQuote: 'No theories yet',
        hypotheses: []
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('- n/a');
    });

    it('throws on non-array hypotheses', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendHypothesesLog({
          id: state.id,
          userQuote: 'Test',
          hypotheses: 'not an array'
        }, tempDir);
      }).toThrow('requires hypotheses array');
    });
  });

  describe('appendCodePathsLog', () => {
    it('appends code paths log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendCodePathsLog({
        id: state.id,
        userQuote: 'Find hot paths',
        keywords: ['database', 'query', 'cache'],
        paths: [
          { file: 'src/db.js', score: 95, symbols: ['query', 'execute'] },
          { file: 'src/cache.js', score: 80 }
        ],
        repoMapStatus: 'generated'
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Code Paths -');
      expect(contents).toContain('Find hot paths');
      expect(contents).toContain('Keywords: database, query, cache');
      expect(contents).toContain('src/db.js (score: 95) [query, execute]');
      expect(contents).toContain('Repo map: generated');
    });

    it('handles empty paths array', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendCodePathsLog({
        id: state.id,
        userQuote: 'No paths found',
        keywords: [],
        paths: []
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('Keywords: n/a');
      expect(contents).toContain('Paths count: 0');
    });
  });

  describe('appendOptimizationLog', () => {
    it('appends optimization log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendOptimizationLog({
        id: state.id,
        userQuote: 'Try caching',
        change: 'Added query result cache',
        delta: { metrics: { latency: -25 } },
        verdict: 'keep',
        runs: 10,
        aggregate: 'p95',
        gitHistory: ['abc123 Add cache layer']
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Optimization -');
      expect(contents).toContain('Try caching');
      expect(contents).toContain('Change: Added query result cache');
      expect(contents).toContain('Verdict: keep');
      expect(contents).toContain('Runs: 10');
      expect(contents).toContain('Aggregate: p95');
      expect(contents).toContain('Git history: abc123 Add cache layer');
    });

    it('throws on missing required fields', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendOptimizationLog({
          id: state.id,
          userQuote: 'Test',
          change: 'Some change',
          delta: {}
        }, tempDir);
      }).toThrow('requires a verdict');
    });
  });

  describe('appendConsolidationLog', () => {
    it('appends consolidation log entry', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendConsolidationLog({
        id: state.id,
        userQuote: 'Save final baseline',
        version: 'v2.0.0',
        path: '.ai-state/perf/baselines/v2.0.0.json'
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('## Consolidation -');
      expect(contents).toContain('Save final baseline');
      expect(contents).toContain('Version: v2.0.0');
      expect(contents).toContain('Baseline file: .ai-state/perf/baselines/v2.0.0.json');
    });

    it('throws on missing path', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendConsolidationLog({
          id: state.id,
          userQuote: 'Test',
          version: 'v1.0.0'
        }, tempDir);
      }).toThrow('requires a path');
    });
  });

  describe('readInvestigation', () => {
    it('returns null for non-existent file', () => {
      const result = investigationState.readInvestigation(tempDir);
      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const perfDir = investigationState.getPerfDir(tempDir);
      fs.mkdirSync(perfDir, { recursive: true });
      fs.writeFileSync(path.join(perfDir, 'investigation.json'), 'not valid json', 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = investigationState.readInvestigation(tempDir);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns null for invalid schema', () => {
      const perfDir = investigationState.getPerfDir(tempDir);
      fs.mkdirSync(perfDir, { recursive: true });
      fs.writeFileSync(path.join(perfDir, 'investigation.json'), JSON.stringify({ invalid: true }), 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = investigationState.readInvestigation(tempDir);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('appendInvestigationLog', () => {
    it('handles empty content gracefully', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);
      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);

      // Empty content should not write anything
      investigationState.appendInvestigationLog(state.id, '', tempDir);

      expect(fs.existsSync(logPath)).toBe(false);
    });

    it('adds newline if missing', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendInvestigationLog(state.id, 'Line without newline', tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toBe('Line without newline\n');
    });

    it('preserves existing newline', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendInvestigationLog(state.id, 'Line with newline\n', tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toBe('Line with newline\n');
    });
  });

  describe('appendBaselineLog validation', () => {
    it('throws on non-object input', () => {
      expect(() => {
        investigationState.appendBaselineLog('not an object', tempDir);
      }).toThrow('requires an input object');
    });

    it('throws on missing id', () => {
      expect(() => {
        investigationState.appendBaselineLog({
          userQuote: 'test',
          command: 'npm test',
          metrics: {},
          baselinePath: '/path'
        }, tempDir);
      }).toThrow('requires a valid investigation id');
    });

    it('throws on missing userQuote', () => {
      expect(() => {
        investigationState.appendBaselineLog({
          id: 'test-id',
          command: 'npm test',
          metrics: {},
          baselinePath: '/path'
        }, tempDir);
      }).toThrow('requires a non-empty userQuote');
    });

    it('throws on array metrics', () => {
      expect(() => {
        investigationState.appendBaselineLog({
          id: 'test-id',
          userQuote: 'test',
          command: 'npm test',
          metrics: [],
          baselinePath: '/path'
        }, tempDir);
      }).toThrow('requires a metrics object');
    });
  });

  describe('appendProfilingLog validation', () => {
    it('throws on non-object input', () => {
      expect(() => {
        investigationState.appendProfilingLog(undefined, tempDir);
      }).toThrow('requires an input object');
    });

    it('throws on missing tool', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendProfilingLog({
          id: state.id,
          userQuote: 'test',
          command: 'profile cmd'
        }, tempDir);
      }).toThrow('requires a tool');
    });

    it('handles missing artifacts and hotspots', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendProfilingLog({
        id: state.id,
        userQuote: 'Profile test',
        tool: 'perf',
        command: 'perf record'
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('Artifacts: n/a');
      expect(contents).toContain('Hotspots: n/a');
    });
  });

  describe('appendDecisionLog validation', () => {
    it('throws on non-object input', () => {
      expect(() => {
        investigationState.appendDecisionLog(123, tempDir);
      }).toThrow('requires an input object');
    });

    it('throws on missing verdict', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      expect(() => {
        investigationState.appendDecisionLog({
          id: state.id,
          userQuote: 'test',
          rationale: 'reasons'
        }, tempDir);
      }).toThrow('requires a verdict');
    });

    it('includes resultsCount when provided', () => {
      const state = investigationState.initializeInvestigation({}, tempDir);

      investigationState.appendDecisionLog({
        id: state.id,
        userQuote: 'Final decision',
        verdict: 'continue',
        rationale: 'More testing needed',
        resultsCount: 5
      }, tempDir);

      const logPath = investigationState.getInvestigationLogPath(state.id, tempDir);
      const contents = fs.readFileSync(logPath, 'utf8');

      expect(contents).toContain('Results count: 5');
    });
  });

  describe('PHASES constant', () => {
    it('exports expected phases', () => {
      expect(investigationState.PHASES).toEqual([
        'setup',
        'baseline',
        'breaking-point',
        'constraints',
        'hypotheses',
        'code-paths',
        'profiling',
        'optimization',
        'decision',
        'consolidation'
      ]);
    });
  });
});
