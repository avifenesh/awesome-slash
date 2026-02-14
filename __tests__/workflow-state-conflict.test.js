const fs = require('fs');
const os = require('os');
const path = require('path');

describe('workflow-state conflict handling', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-conflict-'));
    process.env.AI_STATE_DIR = '.claude';
  });

  afterEach(() => {
    delete process.env.AI_STATE_DIR;
    jest.resetModules();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('updateFlow returns false when updates are continuously overwritten', () => {
    jest.doMock('../lib/utils/atomic-write', () => {
      const fsLocal = require('fs');
      return {
        writeJsonAtomic: (filePath, data) => {
          fsLocal.mkdirSync(path.dirname(filePath), { recursive: true });
          const current = fsLocal.existsSync(filePath)
            ? JSON.parse(fsLocal.readFileSync(filePath, 'utf8'))
            : {};

          const conflicting = {
            ...current,
            ...data,
            status: 'in_progress',
            _version: (current._version || 0) + 1,
            lastUpdate: new Date().toISOString()
          };

          fsLocal.writeFileSync(filePath, JSON.stringify(conflicting, null, 2));
        }
      };
    });

    const workflowState = require('../lib/state/workflow-state');
    workflowState.writeFlow({ phase: 'planning', status: 'in_progress' }, tempDir);

    const ok = workflowState.updateFlow({ status: 'completed' }, tempDir);
    expect(ok).toBe(false);

    const latest = workflowState.readFlow(tempDir);
    expect(latest.status).toBe('in_progress');
  });

  test('completePhase returns null when updateFlow fails', () => {
    jest.doMock('../lib/utils/atomic-write', () => {
      const fsLocal = require('fs');
      return {
        writeJsonAtomic: (filePath, data) => {
          fsLocal.mkdirSync(path.dirname(filePath), { recursive: true });
          const current = fsLocal.existsSync(filePath)
            ? JSON.parse(fsLocal.readFileSync(filePath, 'utf8'))
            : {};

          const conflicting = {
            ...current,
            ...data,
            phase: 'planning',
            status: 'in_progress',
            _version: (current._version || 0) + 1,
            lastUpdate: new Date().toISOString()
          };

          fsLocal.writeFileSync(filePath, JSON.stringify(conflicting, null, 2));
        }
      };
    });

    const workflowState = require('../lib/state/workflow-state');
    workflowState.writeFlow({ phase: 'planning', status: 'in_progress' }, tempDir);

    const result = workflowState.completePhase({ done: true }, tempDir);
    expect(result).toBeNull();
  });
});
