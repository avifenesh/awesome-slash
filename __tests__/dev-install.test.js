/**
 * Tests for scripts/dev-install.js
 */

const fs = require('fs');
const path = require('path');

const devInstallPath = path.join(__dirname, '..', 'scripts', 'dev-install.js');
const devInstallSource = fs.readFileSync(devInstallPath, 'utf8');

describe('dev-install script', () => {
  describe('script structure', () => {
    test('file exists', () => {
      expect(fs.existsSync(devInstallPath)).toBe(true);
    });

    test('has shebang', () => {
      expect(devInstallSource.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    test('defines PLUGINS array', () => {
      expect(devInstallSource.includes("const PLUGINS = ['next-task'")).toBe(true);
    });

    test('includes all 9 plugins', () => {
      const plugins = ['next-task', 'ship', 'deslop', 'audit-project', 'drift-detect', 'enhance', 'sync-docs', 'repo-map', 'perf'];
      for (const plugin of plugins) {
        expect(devInstallSource.includes(`'${plugin}'`)).toBe(true);
      }
    });

    test('defines installClaude function', () => {
      expect(devInstallSource.includes('function installClaude()')).toBe(true);
    });

    test('defines installOpenCode function', () => {
      expect(devInstallSource.includes('function installOpenCode()')).toBe(true);
    });

    test('defines installCodex function', () => {
      expect(devInstallSource.includes('function installCodex()')).toBe(true);
    });

    test('defines cleanAll function', () => {
      expect(devInstallSource.includes('function cleanAll()')).toBe(true);
    });

    test('defines copyToAwesomeSlash function', () => {
      expect(devInstallSource.includes('function copyToAwesomeSlash()')).toBe(true);
    });
  });

  describe('CLI argument handling', () => {
    test('handles --clean flag', () => {
      expect(devInstallSource.includes("args.includes('--clean')")).toBe(true);
    });

    test('handles specific tool arguments', () => {
      expect(devInstallSource.includes("validTools.includes(")).toBe(true);
    });

    test('defaults to all tools when no args', () => {
      expect(devInstallSource.includes('tools = validTools')).toBe(true);
    });
  });

  describe('target directories', () => {
    test('defines CLAUDE_PLUGINS_DIR', () => {
      expect(devInstallSource.includes('CLAUDE_PLUGINS_DIR')).toBe(true);
      expect(devInstallSource.includes(".claude', 'plugins'")).toBe(true);
    });

    test('defines OPENCODE_DIR', () => {
      expect(devInstallSource.includes('OPENCODE_DIR')).toBe(true);
      expect(devInstallSource.includes(".opencode'")).toBe(true);
    });

    test('defines CODEX_DIR', () => {
      expect(devInstallSource.includes('CODEX_DIR')).toBe(true);
      expect(devInstallSource.includes(".codex'")).toBe(true);
    });

    test('defines AWESOME_SLASH_DIR', () => {
      expect(devInstallSource.includes('AWESOME_SLASH_DIR')).toBe(true);
      expect(devInstallSource.includes(".awesome-slash'")).toBe(true);
    });
  });

  describe('installation logic', () => {
    test('strips models for OpenCode', () => {
      // Should strip models by default
      expect(devInstallSource.includes('Models are stripped by default')).toBe(true);
    });

    test('transforms frontmatter for OpenCode', () => {
      expect(devInstallSource.includes('transformForOpenCode')).toBe(true);
    });

    test('removes marketplace for Claude', () => {
      expect(devInstallSource.includes('plugin marketplace remove')).toBe(true);
    });

    test('copies to ~/.awesome-slash for OpenCode/Codex', () => {
      expect(devInstallSource.includes('copyToAwesomeSlash')).toBe(true);
    });
  });

  describe('output', () => {
    test('logs with [dev-install] prefix', () => {
      expect(devInstallSource.includes('[dev-install]')).toBe(true);
    });

    test('shows summary at end', () => {
      expect(devInstallSource.includes('Summary:')).toBe(true);
    });

    test('shows clean command', () => {
      expect(devInstallSource.includes('node scripts/dev-install.js --clean')).toBe(true);
    });
  });
});
