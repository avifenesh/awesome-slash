/**
 * Tests for lib/repo-map/installer.js
 */

const {
  checkInstalled,
  checkInstalledSync,
  getCommand,
  getInstallInstructions,
  getShortInstallSuggestion,
  getMinimumVersion,
  meetsMinimumVersion,
  AST_GREP_COMMANDS
} = require('../lib/repo-map/installer');

describe('repo-map/installer', () => {
  describe('AST_GREP_COMMANDS', () => {
    test('contains expected commands', () => {
      expect(AST_GREP_COMMANDS).toContain('sg');
      expect(AST_GREP_COMMANDS).toContain('ast-grep');
    });
  });

  describe('getMinimumVersion', () => {
    test('returns a valid semver string', () => {
      const version = getMinimumVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('returns 0.20.0 as minimum', () => {
      expect(getMinimumVersion()).toBe('0.20.0');
    });
  });

  describe('meetsMinimumVersion', () => {
    test('returns false for null/undefined', () => {
      expect(meetsMinimumVersion(null)).toBe(false);
      expect(meetsMinimumVersion(undefined)).toBe(false);
      expect(meetsMinimumVersion('')).toBe(false);
    });

    test('returns false for invalid version format', () => {
      expect(meetsMinimumVersion('invalid')).toBe(false);
      expect(meetsMinimumVersion('abc.def.ghi')).toBe(false);
    });

    test('returns true for versions >= minimum', () => {
      expect(meetsMinimumVersion('0.20.0')).toBe(true);
      expect(meetsMinimumVersion('0.20.1')).toBe(true);
      expect(meetsMinimumVersion('0.21.0')).toBe(true);
      expect(meetsMinimumVersion('0.25.0')).toBe(true);
      expect(meetsMinimumVersion('1.0.0')).toBe(true);
    });

    test('returns false for versions < minimum', () => {
      expect(meetsMinimumVersion('0.19.0')).toBe(false);
      expect(meetsMinimumVersion('0.19.9')).toBe(false);
      expect(meetsMinimumVersion('0.10.0')).toBe(false);
    });

    test('handles beta/prerelease versions', () => {
      expect(meetsMinimumVersion('0.25.0-beta.1')).toBe(true);
      expect(meetsMinimumVersion('0.20.0-alpha')).toBe(true);
    });

    test('compares major version correctly', () => {
      expect(meetsMinimumVersion('1.0.0')).toBe(true);
      expect(meetsMinimumVersion('2.0.0')).toBe(true);
    });

    test('compares minor version correctly', () => {
      expect(meetsMinimumVersion('0.19.99')).toBe(false);
      expect(meetsMinimumVersion('0.21.0')).toBe(true);
    });

    test('compares patch version correctly', () => {
      // minimum is 0.20.0
      expect(meetsMinimumVersion('0.20.0')).toBe(true);
      expect(meetsMinimumVersion('0.20.1')).toBe(true);
    });
  });

  describe('getInstallInstructions', () => {
    test('returns non-empty string', () => {
      const instructions = getInstallInstructions();
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(0);
    });

    test('includes npm install command', () => {
      const instructions = getInstallInstructions();
      expect(instructions).toContain('npm install');
      expect(instructions).toContain('@ast-grep/cli');
    });

    test('includes pip install command', () => {
      const instructions = getInstallInstructions();
      expect(instructions).toContain('pip install');
    });

    test('includes verification command', () => {
      const instructions = getInstallInstructions();
      expect(instructions).toContain('sg --version');
    });

    test('includes documentation link', () => {
      const instructions = getInstallInstructions();
      expect(instructions).toContain('ast-grep.github.io');
    });
  });

  describe('getShortInstallSuggestion', () => {
    test('returns non-empty string', () => {
      const suggestion = getShortInstallSuggestion();
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });

    test('includes ast-grep reference', () => {
      const suggestion = getShortInstallSuggestion();
      expect(suggestion.toLowerCase()).toContain('ast-grep');
    });

    test('is a single line', () => {
      const suggestion = getShortInstallSuggestion();
      expect(suggestion.includes('\n')).toBe(false);
    });
  });

  describe('checkInstalledSync', () => {
    test('returns object with found property', () => {
      const result = checkInstalledSync();
      expect(result).toHaveProperty('found');
      expect(typeof result.found).toBe('boolean');
    });

    test('returns version when found', () => {
      const result = checkInstalledSync();
      if (result.found) {
        expect(result).toHaveProperty('version');
        expect(typeof result.version).toBe('string');
      }
    });

    test('returns command when found', () => {
      const result = checkInstalledSync();
      if (result.found) {
        expect(result).toHaveProperty('command');
        expect(typeof result.command).toBe('string');
      }
    });
  });

  describe('checkInstalled', () => {
    test('returns promise', () => {
      const result = checkInstalled();
      expect(result).toBeInstanceOf(Promise);
    });

    test('resolves to object with found property', async () => {
      const result = await checkInstalled();
      expect(result).toHaveProperty('found');
      expect(typeof result.found).toBe('boolean');
    });

    test('returns version when found', async () => {
      const result = await checkInstalled();
      if (result.found) {
        expect(result).toHaveProperty('version');
        expect(typeof result.version).toBe('string');
      }
    });
  });

  describe('getCommand', () => {
    test('returns string or null', () => {
      const result = getCommand();
      expect(result === null || typeof result === 'string').toBe(true);
    });

    test('returns null when ast-grep not installed', () => {
      // This test documents behavior - if ast-grep is installed, it returns the command
      // If not installed, it returns null
      const result = getCommand();
      const syncResult = checkInstalledSync();

      if (syncResult.found) {
        expect(result).not.toBeNull();
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe('integration', () => {
    test('checkInstalledSync and checkInstalled return consistent results', async () => {
      const syncResult = checkInstalledSync();
      const asyncResult = await checkInstalled();

      expect(syncResult.found).toBe(asyncResult.found);
      if (syncResult.found && asyncResult.found) {
        expect(syncResult.version).toBe(asyncResult.version);
      }
    });

    test('getCommand returns command from checkInstalledSync when found', () => {
      const syncResult = checkInstalledSync();
      const command = getCommand();

      if (syncResult.found) {
        expect(command).toBe(syncResult.command);
      } else {
        expect(command).toBeNull();
      }
    });
  });
});
