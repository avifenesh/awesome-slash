const fs = require('fs');
const os = require('os');
const path = require('path');

describe('perf investigation conflict handling', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-conflict-'));
    process.env.AI_STATE_DIR = '.claude';
  });

  afterEach(() => {
    delete process.env.AI_STATE_DIR;
    jest.resetModules();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('updateInvestigation returns latest readable state on continuous conflicts', () => {
    jest.doMock('../lib/utils/atomic-write', () => {
      const fsLocal = require('fs');
      return {
        writeJsonAtomic: (filePath, data) => {
          fsLocal.mkdirSync(path.dirname(filePath), { recursive: true });

          const conflicting = {
            ...data,
            phase: 'setup',
            status: 'in_progress',
            _version: (data._version || 0) + 1,
            updatedAt: new Date().toISOString()
          };

          fsLocal.writeFileSync(filePath, JSON.stringify(conflicting, null, 2));
        },
        writeFileAtomic: (filePath, content) => {
          fsLocal.mkdirSync(path.dirname(filePath), { recursive: true });
          fsLocal.writeFileSync(filePath, content);
        }
      };
    });

    const investigationState = require('../lib/perf/investigation-state');
    investigationState.initializeInvestigation({}, tempDir);

    const updated = investigationState.updateInvestigation({ phase: 'baseline' }, tempDir);
    expect(updated).not.toBeNull();
    expect(updated.phase).toBe('setup');

    const latest = investigationState.readInvestigation(tempDir);
    expect(latest.phase).toBe('setup');
  });
});
