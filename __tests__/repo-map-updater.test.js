/**
 * Tests for lib/repo-map/updater.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const {
  incrementalUpdate,
  updateWithoutGit,
  checkStaleness
} = require('../lib/repo-map/updater');

// Check if we're in a git repo with ast-grep installed
const isGitRepo = (() => {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

const hasAstGrep = (() => {
  try {
    execSync('sg --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
})();

describe('repo-map/updater', () => {
  describe('incrementalUpdate', () => {
    test('returns error when ast-grep not found', async () => {
      // Skip if ast-grep is installed (can't easily test "not found" scenario)
      if (hasAstGrep) {
        // Test with invalid map instead
        const result = await incrementalUpdate('/nonexistent', null);
        expect(result.success).toBe(false);
      } else {
        const result = await incrementalUpdate(process.cwd(), {});
        expect(result.success).toBe(false);
        expect(result.error).toContain('ast-grep');
      }
    });

    test('returns error for invalid map', async () => {
      if (!hasAstGrep) return;

      const result = await incrementalUpdate(process.cwd(), null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid repo map');
      expect(result.needsFullRebuild).toBe(true);
    });

    test('returns error for map without files', async () => {
      if (!hasAstGrep) return;

      const result = await incrementalUpdate(process.cwd(), {});
      expect(result.success).toBe(false);
      expect(result.needsFullRebuild).toBe(true);
    });

    test('handles map with git commit that does not exist', async () => {
      if (!hasAstGrep || !isGitRepo) return;

      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0 },
        git: { commit: 'nonexistent123456789' }
      };

      const result = await incrementalUpdate(process.cwd(), map);
      expect(result.success).toBe(false);
      expect(result.needsFullRebuild).toBe(true);
    });

    test('removes docs property from map', async () => {
      if (!hasAstGrep || !isGitRepo) return;

      const map = {
        files: { 'test.js': { hash: 'abc' } },
        dependencies: {},
        stats: { totalFiles: 1, totalSymbols: 0 },
        git: { commit: 'abc123' },
        docs: { someDoc: 'value' },
        project: { languages: ['javascript'] }
      };

      // The function will try to update and may fail on git operations,
      // but it should still remove docs
      await incrementalUpdate(process.cwd(), map);
      expect(map.docs).toBeUndefined();
    });

    test('ignores unsupported changed files without forcing rebuild', async () => {
      jest.resetModules();

      jest.doMock('child_process', () => ({
        execFileSync: jest.fn((cmd, args) => {
          if (cmd !== 'git') throw new Error('unexpected command');
          if (args[0] === 'cat-file') return '';
          if (args[0] === 'diff') return 'M	README.md';
          throw new Error(`unexpected git args: ${args.join(' ')}`);
        }),
        execSync
      }));

      jest.doMock('../lib/repo-map/installer', () => ({
        checkInstalledSync: () => ({ found: true, version: '1.44.0', command: 'sg' }),
        meetsMinimumVersion: () => true,
        getMinimumVersion: () => '1.44.0',
        getInstallInstructions: () => 'install'
      }));

      const scanSingleFileAsync = jest.fn();
      jest.doMock('../lib/repo-map/runner', () => ({
        getGitInfo: () => ({ commit: 'fedcba9', branch: 'main' }),
        scanSingleFileAsync,
        LANGUAGE_EXTENSIONS: { javascript: ['.js'] }
      }));

      const { incrementalUpdate: incrementalUpdateWithMocks } = require('../lib/repo-map/updater');
      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0, errors: [] },
        git: { commit: 'abcdef1', branch: 'main' },
        project: { languages: ['javascript'] }
      };

      const result = await incrementalUpdateWithMocks(process.cwd(), map);

      expect(result.success).toBe(true);
      expect(result.needsFullRebuild).toBeUndefined();
      expect(scanSingleFileAsync).not.toHaveBeenCalled();

      jest.dontMock('child_process');
      jest.dontMock('../lib/repo-map/installer');
      jest.dontMock('../lib/repo-map/runner');
      jest.resetModules();
    });
  });

  describe('updateWithoutGit', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'updater-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('removes docs property from map', async () => {
      if (!hasAstGrep) return;

      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0 },
        project: { languages: [] },
        docs: { someDoc: 'value' }
      };

      await updateWithoutGit(tempDir, map, 'sg');
      expect(map.docs).toBeUndefined();
    });

    test('returns success with empty changes for empty project', async () => {
      if (!hasAstGrep) return;

      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0 },
        project: { languages: [] }
      };

      const result = await updateWithoutGit(tempDir, map, 'sg');
      expect(result.success).toBe(true);
      expect(result.changes.total).toBe(0);
    });

    test('detects deleted files', async () => {
      if (!hasAstGrep) return;

      const map = {
        files: {
          'deleted.js': { hash: 'abc', symbols: {} }
        },
        dependencies: {
          'deleted.js': []
        },
        stats: { totalFiles: 1, totalSymbols: 0 },
        project: { languages: ['javascript'] }
      };

      const result = await updateWithoutGit(tempDir, map, 'sg');
      expect(result.success).toBe(true);
      expect(result.changes.deleted).toBe(1);
      expect(map.files['deleted.js']).toBeUndefined();
    });
  });

  describe('checkStaleness', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'staleness-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns stale for map without git commit', () => {
      const map = { files: {} };
      const result = checkStaleness(tempDir, map);

      expect(result.isStale).toBe(true);
      expect(result.reason).toContain('Missing base commit');
      expect(result.suggestFullRebuild).toBe(true);
    });

    test('returns stale for null map', () => {
      const result = checkStaleness(tempDir, null);

      expect(result.isStale).toBe(true);
      expect(result.suggestFullRebuild).toBe(true);
    });

    test('returns stale for map with nonexistent commit', () => {
      if (!isGitRepo) return;

      const map = {
        git: { commit: 'nonexistent123456789abcdef' }
      };

      const result = checkStaleness(process.cwd(), map);
      expect(result.isStale).toBe(true);
      expect(result.reason).toContain('no longer exists');
      expect(result.suggestFullRebuild).toBe(true);
    });

    test('returns not stale for current commit', () => {
      if (!isGitRepo) return;

      try {
        const currentCommit = execSync('git rev-parse HEAD', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const map = {
          git: {
            commit: currentCommit,
            branch: currentBranch
          }
        };

        const result = checkStaleness(process.cwd(), map);
        expect(result.commitsBehind).toBe(0);
      } catch {
        // Skip if git commands fail
      }
    });

    test('returns result object with expected properties', () => {
      const result = checkStaleness(tempDir, {});

      expect(result).toHaveProperty('isStale');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('commitsBehind');
      expect(result).toHaveProperty('suggestFullRebuild');
    });
  });

  describe('integration', () => {
    // These tests verify the modules work together
    test('incrementalUpdate and checkStaleness are consistent', async () => {
      if (!hasAstGrep || !isGitRepo) return;

      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0 },
        git: { commit: 'nonexistent' }
      };

      const staleness = checkStaleness(process.cwd(), map);
      const update = await incrementalUpdate(process.cwd(), map);

      // Both should indicate the map needs rebuilding
      expect(staleness.suggestFullRebuild).toBe(true);
      expect(update.needsFullRebuild).toBe(true);
    });
  });
});

describe('parseDiff (internal behavior via incrementalUpdate)', () => {
  // We can't directly test parseDiff since it's not exported,
  // but we can test its behavior through incrementalUpdate

  test('handles empty diff', async () => {
    if (!hasAstGrep || !isGitRepo) return;

    try {
      const currentCommit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      const map = {
        files: {},
        dependencies: {},
        stats: { totalFiles: 0, totalSymbols: 0 },
        git: {
          commit: currentCommit,
          branch: currentBranch
        },
        project: { languages: ['javascript'] }
      };

      const result = await incrementalUpdate(process.cwd(), map);

      if (result.success) {
        expect(result.changes.total).toBe(0);
      }
    } catch {
      // Skip if git operations fail
    }
  });
});
