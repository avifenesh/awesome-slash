const consolidation = require('../lib/perf/consolidation');
const stateDir = require('../lib/platform/state-dir');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('perf consolidation', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-consolidation-'));
    process.env.AI_STATE_DIR = '.ai-state';
    stateDir.clearCache();
  });

  afterEach(() => {
    stateDir.clearCache();
    delete process.env.AI_STATE_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes a single baseline per version', () => {
    const result = consolidation.consolidateBaseline({
      version: 'v1.0.0',
      baseline: {
        command: 'npm run bench',
        metrics: { latency_ms: 120 }
      }
    }, tempDir);

    expect(result.version).toBe('v1.0.0');
    const baselinePath = path.join(tempDir, '.ai-state', 'perf', 'baselines', 'v1.0.0.json');
    expect(fs.existsSync(baselinePath)).toBe(true);
  });
});
