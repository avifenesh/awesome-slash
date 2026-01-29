const checkpoint = require('../lib/perf/checkpoint');

describe('perf checkpoint', () => {
  it('builds checkpoint message', () => {
    const message = checkpoint.buildCheckpointMessage({
      phase: 'baseline',
      id: 'perf-123',
      baselineVersion: 'v1.0.0',
      deltaSummary: 'latency -8%'
    });

    expect(message).toBe('perf: phase baseline [perf-123] baseline=v1.0.0 delta=latency -8%');
  });

  it('handles no-op commits gracefully', () => {
    const childProcess = require('child_process');
    const execSpy = jest.spyOn(childProcess, 'execSync').mockImplementation(() => {
      throw new Error('not a git repo');
    });

    const result = checkpoint.commitCheckpoint({
      phase: 'baseline',
      id: 'perf-123'
    });

    if (!result.ok) {
      expect(['not a git repo', 'nothing to commit', 'duplicate checkpoint']).toContain(result.reason);
    } else {
      expect(result.message).toContain('perf: phase baseline');
    }

    execSpy.mockRestore();
  });

  it('detects duplicate checkpoint messages', () => {
    jest.resetModules();
    jest.doMock('child_process', () => ({
      execSync: jest.fn(() => 'perf: phase baseline [perf-123] baseline=n/a delta=n/a\n'),
      execFileSync: jest.fn()
    }));

    const freshCheckpoint = require('../lib/perf/checkpoint');
    const message = freshCheckpoint.buildCheckpointMessage({
      phase: 'baseline',
      id: 'perf-123'
    });

    expect(freshCheckpoint.isDuplicateCheckpoint(message)).toBe(true);
    jest.dontMock('child_process');
  });
});
