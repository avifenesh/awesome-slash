/**
 * Extended tests for lib/perf/baseline-store.js
 * Covers: listBaselines, path validation, corrupted file handling
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const stateDir = require('../lib/platform/state-dir');
const baselineStore = require('../lib/perf/baseline-store');

describe('baseline-store extended', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-baseline-store-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('listBaselines', () => {
    it('returns empty array for empty directory', () => {
      const baselines = baselineStore.listBaselines(tempDir);
      expect(baselines).toEqual([]);
    });

    it('returns sorted list of baseline versions', () => {
      baselineStore.writeBaseline('v2.0.0', { metrics: { latency: 100 }, command: 'npm test' }, tempDir);
      baselineStore.writeBaseline('v1.0.0', { metrics: { latency: 150 }, command: 'npm test' }, tempDir);
      baselineStore.writeBaseline('v1.5.0', { metrics: { latency: 120 }, command: 'npm test' }, tempDir);

      const baselines = baselineStore.listBaselines(tempDir);
      expect(baselines).toEqual(['v1.0.0', 'v1.5.0', 'v2.0.0']);
    });

    it('filters non-json files', () => {
      baselineStore.writeBaseline('v1.0.0', { metrics: { latency: 100 }, command: 'npm test' }, tempDir);
      const baselineDir = baselineStore.getBaselineDir(tempDir);
      fs.writeFileSync(path.join(baselineDir, 'readme.txt'), 'ignore this', 'utf8');

      const baselines = baselineStore.listBaselines(tempDir);
      expect(baselines).toEqual(['v1.0.0']);
    });
  });

  describe('path validation', () => {
    it('rejects empty version', () => {
      expect(() => baselineStore.getBaselinePath('', tempDir)).toThrow('version is required');
    });

    it('rejects null version', () => {
      expect(() => baselineStore.getBaselinePath(null, tempDir)).toThrow('version is required');
    });

    it('rejects path traversal with ..', () => {
      expect(() => baselineStore.getBaselinePath('../secret', tempDir)).toThrow('invalid characters');
    });

    it('rejects forward slash', () => {
      expect(() => baselineStore.getBaselinePath('dir/version', tempDir)).toThrow('invalid characters');
    });

    it('rejects backslash', () => {
      expect(() => baselineStore.getBaselinePath('dir\\version', tempDir)).toThrow('invalid characters');
    });

    it('rejects null byte', () => {
      expect(() => baselineStore.getBaselinePath('test\0version', tempDir)).toThrow('invalid characters');
    });

    it('accepts valid version characters', () => {
      const validVersions = ['v1.0.0', 'v1.0.0-beta', 'v1.0.0+build.123', 'release_1.0', 'build-abc-123'];
      for (const version of validVersions) {
        expect(() => baselineStore.getBaselinePath(version, tempDir)).not.toThrow();
      }
    });

    it('rejects special characters', () => {
      const invalidVersions = ['v1@0', 'v1#0', 'v1$0', 'v1%0', 'v1&0', 'v1*0', 'v1 0'];
      for (const version of invalidVersions) {
        expect(() => baselineStore.getBaselinePath(version, tempDir)).toThrow('invalid characters');
      }
    });
  });

  describe('readBaseline error handling', () => {
    it('returns null for non-existent baseline', () => {
      const result = baselineStore.readBaseline('non-existent', tempDir);
      expect(result).toBeNull();
    });

    it('returns null for corrupted JSON', () => {
      const baselineDir = baselineStore.ensureBaselineDir(tempDir);
      fs.writeFileSync(path.join(baselineDir, 'corrupted.json'), 'not valid json {', 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = baselineStore.readBaseline('corrupted', tempDir);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CRITICAL] Corrupted baseline'));
      consoleSpy.mockRestore();
    });

    it('returns null for invalid schema', () => {
      const baselineDir = baselineStore.ensureBaselineDir(tempDir);
      fs.writeFileSync(path.join(baselineDir, 'invalid.json'), JSON.stringify({ invalid: true }), 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = baselineStore.readBaseline('invalid', tempDir);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CRITICAL] Invalid baseline'));
      consoleSpy.mockRestore();
    });
  });

  describe('writeBaseline', () => {
    it('auto-populates version and recordedAt', () => {
      baselineStore.writeBaseline('v1.0.0', {
        command: 'npm run bench',
        metrics: { latency: 100 }
      }, tempDir);

      const baseline = baselineStore.readBaseline('v1.0.0', tempDir);
      expect(baseline.version).toBe('v1.0.0');
      expect(baseline.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('overwrites existing baseline', () => {
      baselineStore.writeBaseline('v1.0.0', {
        command: 'npm run bench',
        metrics: { latency: 100 }
      }, tempDir);

      baselineStore.writeBaseline('v1.0.0', {
        command: 'npm run bench',
        metrics: { latency: 80 }
      }, tempDir);

      const baseline = baselineStore.readBaseline('v1.0.0', tempDir);
      expect(baseline.metrics.latency).toBe(80);
    });

    it('throws on invalid baseline data', () => {
      expect(() => {
        baselineStore.writeBaseline('v1.0.0', {
          command: 'npm test',
          metrics: { latency: 'not a number' }
        }, tempDir);
      }).toThrow('Invalid baseline payload');
    });
  });

  describe('ensureBaselineDir', () => {
    it('creates directory recursively', () => {
      const baselineDir = baselineStore.ensureBaselineDir(tempDir);
      expect(fs.existsSync(baselineDir)).toBe(true);
    });

    it('returns same path on repeated calls', () => {
      const dir1 = baselineStore.ensureBaselineDir(tempDir);
      const dir2 = baselineStore.ensureBaselineDir(tempDir);
      expect(dir1).toBe(dir2);
    });
  });

  describe('getBaselineDir', () => {
    it('returns correct path structure', () => {
      const baselineDir = baselineStore.getBaselineDir(tempDir);
      expect(baselineDir).toContain('.ai-state');
      expect(baselineDir).toContain('perf');
      expect(baselineDir).toContain('baselines');
    });
  });

  describe('multi-scenario baselines', () => {
    it('writes and reads multi-scenario baseline', () => {
      baselineStore.writeBaseline('v1.0.0', {
        command: 'npm run bench -- --scenario all',
        metrics: {
          scenarios: {
            low: { latency_ms: 50, throughput_rps: 1000 },
            medium: { latency_ms: 100, throughput_rps: 800 },
            high: { latency_ms: 200, throughput_rps: 500 }
          }
        }
      }, tempDir);

      const baseline = baselineStore.readBaseline('v1.0.0', tempDir);
      expect(baseline.metrics.scenarios.low.latency_ms).toBe(50);
      expect(baseline.metrics.scenarios.high.throughput_rps).toBe(500);
    });
  });

  describe('baseline with env', () => {
    it('writes and reads baseline with environment variables', () => {
      baselineStore.writeBaseline('v1.0.0', {
        command: 'npm run bench',
        metrics: { latency: 100 },
        env: {
          NODE_ENV: 'production',
          CONCURRENCY: '50'
        }
      }, tempDir);

      const baseline = baselineStore.readBaseline('v1.0.0', tempDir);
      expect(baseline.env.NODE_ENV).toBe('production');
      expect(baseline.env.CONCURRENCY).toBe('50');
    });
  });
});
