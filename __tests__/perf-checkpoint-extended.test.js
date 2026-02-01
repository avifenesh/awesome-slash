/**
 * Extended tests for lib/perf/checkpoint.js
 * Covers: buildCheckpointMessage validation, getRecentCommits, error handling
 */

describe('perf checkpoint extended', () => {
  let checkpoint;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('child_process');
  });

  describe('buildCheckpointMessage', () => {
    beforeEach(() => {
      checkpoint = require('../lib/perf/checkpoint');
    });

    it('throws on non-object input', () => {
      expect(() => checkpoint.buildCheckpointMessage(null)).toThrow('must be an object');
      expect(() => checkpoint.buildCheckpointMessage('string')).toThrow('must be an object');
      expect(() => checkpoint.buildCheckpointMessage(undefined)).toThrow('must be an object');
    });

    it('throws on missing phase', () => {
      expect(() => checkpoint.buildCheckpointMessage({
        id: 'perf-123'
      })).toThrow('phase is required');
    });

    it('throws on invalid phase type', () => {
      expect(() => checkpoint.buildCheckpointMessage({
        phase: 123,
        id: 'perf-123'
      })).toThrow('phase is required');
    });

    it('throws on missing id', () => {
      expect(() => checkpoint.buildCheckpointMessage({
        phase: 'baseline'
      })).toThrow('id is required');
    });

    it('throws on invalid id type', () => {
      expect(() => checkpoint.buildCheckpointMessage({
        phase: 'baseline',
        id: { invalid: true }
      })).toThrow('id is required');
    });

    it('uses default values for optional fields', () => {
      const message = checkpoint.buildCheckpointMessage({
        phase: 'profiling',
        id: 'perf-456'
      });
      expect(message).toBe('perf: phase profiling [perf-456] baseline=n/a delta=n/a');
    });

    it('includes all provided fields', () => {
      const message = checkpoint.buildCheckpointMessage({
        phase: 'optimization',
        id: 'perf-789',
        baselineVersion: 'v3.0.0',
        deltaSummary: 'latency -15%, throughput +20%'
      });
      expect(message).toBe('perf: phase optimization [perf-789] baseline=v3.0.0 delta=latency -15%, throughput +20%');
    });
  });

  describe('getRecentCommits', () => {
    it('returns empty array on git error', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn(() => { throw new Error('not a git repo'); })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const commits = freshCheckpoint.getRecentCommits();
      expect(commits).toEqual([]);
    });

    it('parses git log output correctly', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn(() => 'abc1234 First commit\ndef5678 Second commit\nghi9012 Third commit')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const commits = freshCheckpoint.getRecentCommits(3);
      expect(commits).toEqual([
        'abc1234 First commit',
        'def5678 Second commit',
        'ghi9012 Third commit'
      ]);
    });

    it('handles empty git log output', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn(() => '')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const commits = freshCheckpoint.getRecentCommits();
      expect(commits).toEqual([]);
    });

    it('filters empty lines', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn(() => 'abc1234 Commit\n\ndef5678 Another\n')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const commits = freshCheckpoint.getRecentCommits();
      expect(commits).toEqual(['abc1234 Commit', 'def5678 Another']);
    });

    it('handles non-finite limit', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn(() => 'abc Commit')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      // Should default to 5 for non-finite limits
      const commits = freshCheckpoint.getRecentCommits(NaN);
      expect(commits).toEqual(['abc Commit']);
    });

    it('enforces minimum limit of 1', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(),
        execFileSync: jest.fn((cmd, args) => {
          // Verify the limit argument
          expect(args[1]).toBe('-1');
          return 'abc Commit';
        })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      freshCheckpoint.getRecentCommits(0);
    });
  });

  describe('getLastCommitMessage', () => {
    it('returns null on git error', () => {
      jest.doMock('child_process', () => ({
        execSync: jest.fn(() => { throw new Error('not a git repo'); }),
        execFileSync: jest.fn()
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const message = freshCheckpoint.getLastCommitMessage();
      expect(message).toBeNull();
    });

    it('trims the returned message', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => '  Some commit message  \n')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const message = freshCheckpoint.getLastCommitMessage();
      expect(message).toBe('Some commit message');
    });
  });

  describe('isDuplicateCheckpoint', () => {
    it('returns false when no last commit', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => { throw new Error('no commits'); })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isDuplicateCheckpoint('any message')).toBe(false);
    });

    it('handles null/undefined message', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => 'some message')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isDuplicateCheckpoint(null)).toBe(false);
      expect(freshCheckpoint.isDuplicateCheckpoint(undefined)).toBe(false);
    });

    it('compares trimmed messages', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => '  perf: phase test [id] baseline=n/a delta=n/a  ')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isDuplicateCheckpoint('perf: phase test [id] baseline=n/a delta=n/a')).toBe(true);
    });
  });

  describe('isWorkingTreeClean', () => {
    it('returns true for empty status', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => '')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isWorkingTreeClean()).toBe(true);
    });

    it('returns false for dirty status', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => 'M  file.js')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isWorkingTreeClean()).toBe(false);
    });

    it('trims whitespace-only output', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => '   \n  ')
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      expect(freshCheckpoint.isWorkingTreeClean()).toBe(true);
    });
  });

  describe('commitCheckpoint integration', () => {
    it('returns not a git repo error', () => {
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn(() => { throw new Error('not a git repo'); })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const result = freshCheckpoint.commitCheckpoint({
        phase: 'baseline',
        id: 'perf-test'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not a git repo');
    });

    it('returns nothing to commit for clean tree', () => {
      let callCount = 0;
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn((cmd, args) => {
          callCount++;
          // git rev-parse --is-inside-work-tree succeeds
          if (callCount === 1) return '';
          // git status --porcelain returns empty (clean tree)
          if (args && args.includes('status')) return '';
          return '';
        })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const result = freshCheckpoint.commitCheckpoint({
        phase: 'baseline',
        id: 'perf-test'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('nothing to commit');
    });

    it('returns duplicate checkpoint error', () => {
      let callCount = 0;
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn((cmd, args) => {
          callCount++;
          // git rev-parse --is-inside-work-tree
          if (callCount === 1) return '';
          // git status --porcelain returns dirty
          if (args && args.includes('status')) return 'M file.js';
          // git log -1 --pretty=%B returns duplicate message
          if (args && args.includes('log')) return 'perf: phase baseline [perf-test] baseline=n/a delta=n/a';
          return '';
        })
      }));
      jest.resetModules();
      const freshCheckpoint = require('../lib/perf/checkpoint');

      const result = freshCheckpoint.commitCheckpoint({
        phase: 'baseline',
        id: 'perf-test'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('duplicate checkpoint');
    });
  });
});
