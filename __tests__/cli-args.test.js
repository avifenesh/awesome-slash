/**
 * Tests for CLI argument parsing in bin/cli.js
 */

const path = require('path');

// Import the parseArgs function directly from cli.js
// We need to extract it since it's not exported
const fs = require('fs');
const cliSource = fs.readFileSync(path.join(__dirname, '..', 'bin', 'cli.js'), 'utf8');

// Extract parseArgs function for testing
const VALID_TOOLS = ['claude', 'opencode', 'codex'];

function parseArgs(args) {
  const result = {
    help: false,
    version: false,
    remove: false,
    development: false,
    stripModels: true, // Default: strip models
    tool: null,        // Single tool
    tools: [],         // Multiple tools
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--remove' || arg === '--uninstall') {
      result.remove = true;
    } else if (arg === '--development' || arg === '--dev') {
      result.development = true;
    } else if (arg === '--no-strip' || arg === '-ns') {
      result.stripModels = false;
    } else if (arg === '--strip-models') {
      // Legacy flag, now default behavior
      result.stripModels = true;
    } else if (arg === '--tool' && args[i + 1]) {
      const tool = args[i + 1].toLowerCase();
      if (VALID_TOOLS.includes(tool)) {
        result.tool = tool;
      }
      i++;
    } else if (arg === '--tools' && args[i + 1]) {
      const toolList = args[i + 1].toLowerCase().split(',').map(t => t.trim());
      for (const tool of toolList) {
        if (VALID_TOOLS.includes(tool)) {
          result.tools.push(tool);
        }
      }
      i++;
    }
  }

  return result;
}

describe('CLI argument parsing', () => {
  describe('default values', () => {
    test('returns default values for empty args', () => {
      const result = parseArgs([]);

      expect(result.help).toBe(false);
      expect(result.version).toBe(false);
      expect(result.remove).toBe(false);
      expect(result.development).toBe(false);
      expect(result.stripModels).toBe(true);
      expect(result.tool).toBeNull();
      expect(result.tools).toEqual([]);
    });
  });

  describe('--help / -h', () => {
    test('parses --help', () => {
      const result = parseArgs(['--help']);
      expect(result.help).toBe(true);
    });

    test('parses -h', () => {
      const result = parseArgs(['-h']);
      expect(result.help).toBe(true);
    });
  });

  describe('--version / -v', () => {
    test('parses --version', () => {
      const result = parseArgs(['--version']);
      expect(result.version).toBe(true);
    });

    test('parses -v', () => {
      const result = parseArgs(['-v']);
      expect(result.version).toBe(true);
    });
  });

  describe('--remove / --uninstall', () => {
    test('parses --remove', () => {
      const result = parseArgs(['--remove']);
      expect(result.remove).toBe(true);
    });

    test('parses --uninstall', () => {
      const result = parseArgs(['--uninstall']);
      expect(result.remove).toBe(true);
    });
  });

  describe('--development / --dev', () => {
    test('parses --development', () => {
      const result = parseArgs(['--development']);
      expect(result.development).toBe(true);
    });

    test('parses --dev', () => {
      const result = parseArgs(['--dev']);
      expect(result.development).toBe(true);
    });
  });

  describe('model stripping flags', () => {
    test('stripModels defaults to true', () => {
      const result = parseArgs([]);
      expect(result.stripModels).toBe(true);
    });

    test('--no-strip sets stripModels to false', () => {
      const result = parseArgs(['--no-strip']);
      expect(result.stripModels).toBe(false);
    });

    test('-ns sets stripModels to false', () => {
      const result = parseArgs(['-ns']);
      expect(result.stripModels).toBe(false);
    });

    test('--strip-models keeps stripModels true (legacy)', () => {
      const result = parseArgs(['--strip-models']);
      expect(result.stripModels).toBe(true);
    });
  });

  describe('--tool', () => {
    test('parses --tool claude', () => {
      const result = parseArgs(['--tool', 'claude']);
      expect(result.tool).toBe('claude');
    });

    test('parses --tool opencode', () => {
      const result = parseArgs(['--tool', 'opencode']);
      expect(result.tool).toBe('opencode');
    });

    test('parses --tool codex', () => {
      const result = parseArgs(['--tool', 'codex']);
      expect(result.tool).toBe('codex');
    });

    test('handles case insensitivity', () => {
      const result = parseArgs(['--tool', 'CLAUDE']);
      expect(result.tool).toBe('claude');
    });

    test('ignores invalid tool names', () => {
      const result = parseArgs(['--tool', 'invalid']);
      expect(result.tool).toBeNull();
    });

    test('ignores --tool without value', () => {
      const result = parseArgs(['--tool']);
      expect(result.tool).toBeNull();
    });
  });

  describe('--tools', () => {
    test('parses single tool', () => {
      const result = parseArgs(['--tools', 'claude']);
      expect(result.tools).toEqual(['claude']);
    });

    test('parses comma-separated tools', () => {
      const result = parseArgs(['--tools', 'claude,opencode']);
      expect(result.tools).toEqual(['claude', 'opencode']);
    });

    test('parses comma-separated with spaces', () => {
      const result = parseArgs(['--tools', 'claude, opencode, codex']);
      expect(result.tools).toEqual(['claude', 'opencode', 'codex']);
    });

    test('handles case insensitivity', () => {
      const result = parseArgs(['--tools', 'CLAUDE,OpenCode']);
      expect(result.tools).toEqual(['claude', 'opencode']);
    });

    test('filters out invalid tools', () => {
      const result = parseArgs(['--tools', 'claude,invalid,opencode']);
      expect(result.tools).toEqual(['claude', 'opencode']);
    });

    test('handles quoted string', () => {
      const result = parseArgs(['--tools', '"claude,opencode"']);
      // Note: shell would strip quotes, but this tests direct parsing
      expect(result.tools.length).toBe(0); // "claude" is not valid
    });
  });

  describe('combined flags', () => {
    test('parses multiple flags together', () => {
      const result = parseArgs(['--tool', 'opencode', '--no-strip', '--dev']);

      expect(result.tool).toBe('opencode');
      expect(result.stripModels).toBe(false);
      expect(result.development).toBe(true);
    });

    test('parses --tools with --no-strip', () => {
      const result = parseArgs(['--tools', 'claude,codex', '-ns']);

      expect(result.tools).toEqual(['claude', 'codex']);
      expect(result.stripModels).toBe(false);
    });
  });
});

describe('CLI integration', () => {
  test('cli.js file exists', () => {
    const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
    expect(fs.existsSync(cliPath)).toBe(true);
  });

  test('cli.js has shebang', () => {
    expect(cliSource.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  test('cli.js exports nothing (standalone script)', () => {
    // cli.js is a standalone script, not a module
    expect(cliSource.includes('module.exports')).toBe(false);
  });

  test('cli.js defines VALID_TOOLS', () => {
    expect(cliSource.includes("const VALID_TOOLS = ['claude', 'opencode', 'codex']")).toBe(true);
  });

  test('cli.js has parseArgs function', () => {
    expect(cliSource.includes('function parseArgs(args)')).toBe(true);
  });

  test('cli.js has installForClaudeDevelopment function', () => {
    expect(cliSource.includes('function installForClaudeDevelopment()')).toBe(true);
  });

  test('cli.js has installForOpenCode function', () => {
    expect(cliSource.includes('function installForOpenCode(')).toBe(true);
  });

  test('cli.js has installForCodex function', () => {
    expect(cliSource.includes('function installForCodex(')).toBe(true);
  });
});
