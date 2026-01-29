const fs = require('fs');
const os = require('os');
const path = require('path');

const stateDir = require('../lib/platform/state-dir');
const baselineStore = require('../lib/perf/baseline-store');
const baselineComparator = require('../lib/perf/baseline-comparator');

describe('perf baseline store', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-baseline-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes and reads baselines', () => {
    baselineStore.writeBaseline('v1.0.0', { metrics: { latency: 120 }, command: 'npm run bench' }, tempDir);
    const baseline = baselineStore.readBaseline('v1.0.0', tempDir);
    expect(baseline).not.toBeNull();
    expect(baseline.metrics.latency).toBe(120);
  });

  it('rejects invalid baseline versions', () => {
    expect(() => baselineStore.getBaselinePath('../v1.0.0', tempDir)).toThrow();
  });

  it('compares baseline metrics', () => {
    const result = baselineComparator.compareBaselines(
      { metrics: { latency: 100 } },
      { metrics: { latency: 125 } }
    );
    expect(result.metrics.latency.delta).toBe(25);
  });
});
