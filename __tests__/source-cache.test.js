/**
 * Tests for lib/sources/source-cache.js
 *
 * Focused tests for the source cache module with proper temp directory isolation.
 * Tests cover:
 * - Reading preferences when file doesn't exist
 * - Saving preferences
 * - Loading preferences
 * - Platform-aware path resolution
 * - Tool capabilities caching
 * - Security (path traversal prevention)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const sourceCache = require('../lib/sources/source-cache');
const stateDir = require('../lib/platform/state-dir');

describe('source-cache', () => {
  const originalEnv = { ...process.env };
  let tempDirs = [];

  /**
   * Create an isolated temp directory for testing
   */
  function makeTempDir(prefix = 'source-cache-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  /**
   * Setup isolated test environment with custom state directory
   */
  function setupIsolatedEnv() {
    const tempDir = makeTempDir();
    const stateDirectory = path.join(tempDir, '.test-state');
    process.env.AI_STATE_DIR = stateDirectory;
    stateDir.clearCache();
    return { tempDir, stateDirectory };
  }

  beforeEach(() => {
    stateDir.clearCache();
  });

  afterEach(() => {
    // Restore original environment
    stateDir.clearCache();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }

    // Cleanup temp directories
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    tempDirs = [];
  });

  describe('getPreference', () => {
    it('returns null when preference file does not exist', () => {
      setupIsolatedEnv();
      expect(sourceCache.getPreference()).toBeNull();
    });

    it('returns null when sources directory does not exist', () => {
      const { stateDirectory } = setupIsolatedEnv();
      // Ensure the state directory exists but sources subdirectory does not
      fs.mkdirSync(stateDirectory, { recursive: true });
      expect(sourceCache.getPreference()).toBeNull();
    });

    it('returns null and logs error for corrupted JSON', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');
      fs.mkdirSync(sourcesDir, { recursive: true });
      fs.writeFileSync(path.join(sourcesDir, 'preference.json'), 'not valid json{{{');

      // Should return null without throwing
      const result = sourceCache.getPreference();
      expect(result).toBeNull();
    });
  });

  describe('savePreference', () => {
    it('creates sources directory if it does not exist', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');

      expect(fs.existsSync(sourcesDir)).toBe(false);

      sourceCache.savePreference({ source: 'github' });

      expect(fs.existsSync(sourcesDir)).toBe(true);
    });

    it('saves simple source preference', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });

      const pref = sourceCache.getPreference();
      expect(pref.source).toBe('github');
      expect(pref.savedAt).toBeDefined();
    });

    it('saves custom source preference with type and tool', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({
        source: 'custom',
        type: 'cli',
        tool: 'tea'
      });

      const pref = sourceCache.getPreference();
      expect(pref.source).toBe('custom');
      expect(pref.type).toBe('cli');
      expect(pref.tool).toBe('tea');
      expect(pref.savedAt).toBeDefined();
    });

    it('overwrites existing preference', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });
      sourceCache.savePreference({ source: 'gitlab' });

      const pref = sourceCache.getPreference();
      expect(pref.source).toBe('gitlab');
    });

    it('preserves custom fields in preference', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({
        source: 'custom',
        type: 'mcp',
        tool: 'linear-mcp',
        extraField: 'preserved'
      });

      const pref = sourceCache.getPreference();
      expect(pref.extraField).toBe('preserved');
    });
  });

  describe('loading preferences', () => {
    it('loads preference saved in same session', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });
      const pref = sourceCache.getPreference();

      expect(pref).not.toBeNull();
      expect(pref.source).toBe('github');
    });

    it('loads preference saved with all custom fields', () => {
      setupIsolatedEnv();

      const fullPreference = {
        source: 'custom',
        type: 'cli',
        tool: 'glab',
        features: ['issues', 'prs', 'ci']
      };

      sourceCache.savePreference(fullPreference);
      const pref = sourceCache.getPreference();

      expect(pref.source).toBe('custom');
      expect(pref.type).toBe('cli');
      expect(pref.tool).toBe('glab');
      expect(pref.features).toEqual(['issues', 'prs', 'ci']);
    });

    it('loads preference persisted to disk (simulated session reload)', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');
      fs.mkdirSync(sourcesDir, { recursive: true });

      // Manually write a preference file (simulating previous session)
      const prefData = {
        source: 'gitlab',
        savedAt: '2024-01-01T00:00:00.000Z'
      };
      fs.writeFileSync(
        path.join(sourcesDir, 'preference.json'),
        JSON.stringify(prefData, null, 2)
      );

      const pref = sourceCache.getPreference();
      expect(pref.source).toBe('gitlab');
      expect(pref.savedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('platform-aware path resolution', () => {
    it('uses AI_STATE_DIR when set', () => {
      const tempDir = makeTempDir();
      const customStateDir = path.join(tempDir, '.my-custom-state');
      process.env.AI_STATE_DIR = customStateDir;
      stateDir.clearCache();

      sourceCache.savePreference({ source: 'github' });

      // Verify file was created in the custom state directory
      const preferencePath = path.join(customStateDir, 'sources', 'preference.json');
      expect(fs.existsSync(preferencePath)).toBe(true);
    });

    it('detects OpenCode environment via env var', () => {
      const tempDir = makeTempDir();
      process.cwd = () => tempDir;

      // Clear any AI_STATE_DIR override
      delete process.env.AI_STATE_DIR;
      process.env.OPENCODE_CONFIG = '/some/path';
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.opencode');

      delete process.env.OPENCODE_CONFIG;
    });

    it('detects Codex environment via env var', () => {
      const tempDir = makeTempDir();

      delete process.env.AI_STATE_DIR;
      process.env.CODEX_HOME = '/some/path';
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.codex');

      delete process.env.CODEX_HOME;
    });

    it('detects OpenCode via directory presence', () => {
      const tempDir = makeTempDir();
      fs.mkdirSync(path.join(tempDir, '.opencode'));

      delete process.env.AI_STATE_DIR;
      delete process.env.OPENCODE_CONFIG;
      delete process.env.CODEX_HOME;
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.opencode');
    });

    it('detects Codex via directory presence', () => {
      const tempDir = makeTempDir();
      fs.mkdirSync(path.join(tempDir, '.codex'));

      delete process.env.AI_STATE_DIR;
      delete process.env.OPENCODE_CONFIG;
      delete process.env.CODEX_HOME;
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.codex');
    });

    it('defaults to .claude when no platform detected', () => {
      const tempDir = makeTempDir();

      delete process.env.AI_STATE_DIR;
      delete process.env.OPENCODE_CONFIG;
      delete process.env.OPENCODE_CONFIG_DIR;
      delete process.env.CODEX_HOME;
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.claude');
    });

    it('prioritizes OpenCode over Codex when both directories exist', () => {
      const tempDir = makeTempDir();
      fs.mkdirSync(path.join(tempDir, '.opencode'));
      fs.mkdirSync(path.join(tempDir, '.codex'));

      delete process.env.AI_STATE_DIR;
      delete process.env.OPENCODE_CONFIG;
      delete process.env.CODEX_HOME;
      stateDir.clearCache();

      const detectedDir = stateDir.getStateDir(tempDir);
      expect(detectedDir).toBe('.opencode');
    });
  });

  describe('getToolCapabilities', () => {
    it('returns null for unknown tool', () => {
      setupIsolatedEnv();
      expect(sourceCache.getToolCapabilities('unknown-tool')).toBeNull();
    });

    it('returns cached capabilities after saving', () => {
      setupIsolatedEnv();

      const capabilities = {
        features: ['issues', 'prs', 'ci'],
        commands: {
          list_issues: 'tea issues list',
          create_pr: 'tea pulls create'
        }
      };

      sourceCache.saveToolCapabilities('tea', capabilities);
      const cached = sourceCache.getToolCapabilities('tea');

      expect(cached.features).toEqual(['issues', 'prs', 'ci']);
      expect(cached.commands.list_issues).toBe('tea issues list');
      expect(cached.discoveredAt).toBeDefined();
    });

    it('returns null for corrupted capabilities JSON', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');
      fs.mkdirSync(sourcesDir, { recursive: true });
      fs.writeFileSync(path.join(sourcesDir, 'mytool.json'), '{invalid json');

      const result = sourceCache.getToolCapabilities('mytool');
      expect(result).toBeNull();
    });
  });

  describe('saveToolCapabilities', () => {
    it('creates sources directory if needed', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');

      expect(fs.existsSync(sourcesDir)).toBe(false);

      sourceCache.saveToolCapabilities('tea', { features: [] });

      expect(fs.existsSync(sourcesDir)).toBe(true);
    });

    it('adds discoveredAt timestamp', () => {
      setupIsolatedEnv();

      sourceCache.saveToolCapabilities('glab', { features: ['ci'] });
      const cached = sourceCache.getToolCapabilities('glab');

      expect(cached.discoveredAt).toBeDefined();
      expect(new Date(cached.discoveredAt).getTime()).not.toBeNaN();
    });
  });

  describe('clearCache', () => {
    it('removes all cached files', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });
      sourceCache.saveToolCapabilities('tea', { features: [] });
      sourceCache.saveToolCapabilities('glab', { features: [] });

      sourceCache.clearCache();

      expect(sourceCache.getPreference()).toBeNull();
      expect(sourceCache.getToolCapabilities('tea')).toBeNull();
      expect(sourceCache.getToolCapabilities('glab')).toBeNull();
    });

    it('handles non-existent sources directory gracefully', () => {
      setupIsolatedEnv();

      // Should not throw when sources directory does not exist
      expect(() => sourceCache.clearCache()).not.toThrow();
    });

    it('only removes files, not subdirectories', () => {
      const { stateDirectory } = setupIsolatedEnv();
      const sourcesDir = path.join(stateDirectory, 'sources');
      const subDir = path.join(sourcesDir, 'nested');

      sourceCache.savePreference({ source: 'github' });
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'keep.txt'), 'should remain');

      sourceCache.clearCache();

      // Preference should be cleared
      expect(sourceCache.getPreference()).toBeNull();
      // But nested directory should remain
      expect(fs.existsSync(subDir)).toBe(true);
    });
  });

  describe('isPreferred', () => {
    it('returns true for matching source', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });

      expect(sourceCache.isPreferred('github')).toBe(true);
    });

    it('returns false for non-matching source', () => {
      setupIsolatedEnv();

      sourceCache.savePreference({ source: 'github' });

      expect(sourceCache.isPreferred('gitlab')).toBe(false);
    });

    it('returns false when no preference cached', () => {
      setupIsolatedEnv();

      expect(sourceCache.isPreferred('github')).toBe(false);
    });
  });

  describe('security - path traversal prevention', () => {
    it('rejects tool names with path traversal sequences', () => {
      setupIsolatedEnv();

      expect(sourceCache.getToolCapabilities('../../etc/passwd')).toBeNull();
      expect(sourceCache.getToolCapabilities('../malicious')).toBeNull();
    });

    it('rejects tool names with forward slashes', () => {
      setupIsolatedEnv();

      expect(sourceCache.getToolCapabilities('some/path/tool')).toBeNull();
    });

    it('rejects tool names with backslashes', () => {
      setupIsolatedEnv();

      expect(sourceCache.getToolCapabilities('some\\path\\tool')).toBeNull();
    });

    it('rejects tool names with double dots', () => {
      setupIsolatedEnv();

      expect(sourceCache.getToolCapabilities('..foo')).toBeNull();
    });

    it('does not save capabilities for invalid tool names', () => {
      setupIsolatedEnv();

      // This should silently fail (log error but not throw)
      sourceCache.saveToolCapabilities('../malicious', { features: ['pwned'] });

      // Should not have created any file
      expect(sourceCache.getToolCapabilities('malicious')).toBeNull();
    });

    it('accepts valid tool names with dashes and underscores', () => {
      setupIsolatedEnv();

      sourceCache.saveToolCapabilities('my-tool_v2', { features: ['test'] });
      const cached = sourceCache.getToolCapabilities('my-tool_v2');

      expect(cached).not.toBeNull();
      expect(cached.features).toEqual(['test']);
    });
  });

  describe('concurrent operations', () => {
    it('handles rapid save/load cycles', () => {
      setupIsolatedEnv();

      // Rapid saves
      for (let i = 0; i < 10; i++) {
        sourceCache.savePreference({ source: `source-${i}` });
      }

      // Final value should be the last one saved
      const pref = sourceCache.getPreference();
      expect(pref.source).toBe('source-9');
    });

    it('handles saving multiple tool capabilities', () => {
      setupIsolatedEnv();

      const tools = ['gh', 'glab', 'tea', 'jira-cli', 'linear'];
      for (const tool of tools) {
        sourceCache.saveToolCapabilities(tool, { features: [tool] });
      }

      // All should be retrievable
      for (const tool of tools) {
        const cached = sourceCache.getToolCapabilities(tool);
        expect(cached.features).toEqual([tool]);
      }
    });
  });
});
