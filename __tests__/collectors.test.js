/**
 * Tests for shared collectors infrastructure
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const collectors = require('../lib/collectors');

describe('collectors', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collectors-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('module structure', () => {
    test('exports main collect function', () => {
      expect(typeof collectors.collect).toBe('function');
    });

    test('exports collectAllData for backward compat', () => {
      expect(typeof collectors.collectAllData).toBe('function');
    });

    test('exports github namespace', () => {
      expect(collectors.github).toBeDefined();
      expect(typeof collectors.scanGitHubState).toBe('function');
      expect(typeof collectors.isGhAvailable).toBe('function');
    });

    test('exports documentation namespace', () => {
      expect(collectors.documentation).toBeDefined();
      expect(typeof collectors.analyzeDocumentation).toBe('function');
    });

    test('exports codebase namespace', () => {
      expect(collectors.codebase).toBeDefined();
      expect(typeof collectors.scanCodebase).toBe('function');
    });

    test('exports docsPatterns namespace', () => {
      expect(collectors.docsPatterns).toBeDefined();
      expect(typeof collectors.docsPatterns.findRelatedDocs).toBe('function');
      expect(typeof collectors.docsPatterns.analyzeDocIssues).toBe('function');
      expect(typeof collectors.docsPatterns.checkChangelog).toBe('function');
    });
  });

  describe('collect()', () => {
    test('collects from specified collectors', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');

      const result = await collectors.collect({
        collectors: ['docs'],
        cwd: testDir
      });

      expect(result.docs).toBeDefined();
      expect(result.github).toBeNull();
      expect(result.code).toBeNull();
    });

    test('collects from multiple collectors', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

      const result = await collectors.collect({
        collectors: ['docs', 'code'],
        cwd: testDir
      });

      expect(result.docs).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.github).toBeNull();
    });

    test('includes timestamp in result', async () => {
      const result = await collectors.collect({
        collectors: ['docs'],
        cwd: testDir
      });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    test('includes options in result', async () => {
      const result = await collectors.collect({
        collectors: ['docs'],
        cwd: testDir,
        depth: 'quick'
      });

      expect(result.options).toBeDefined();
      expect(result.options.depth).toBe('quick');
    });
  });

  describe('docsPatterns.findRelatedDocs()', () => {
    test('finds docs referencing changed files', () => {
      // Create a README that references a source file
      fs.writeFileSync(path.join(testDir, 'README.md'), `
# Project

See \`src/utils.js\` for utility functions.
      `);

      // findRelatedDocs returns an array directly
      const result = collectors.docsPatterns.findRelatedDocs(
        ['src/utils.js'],
        { cwd: testDir }
      );

      expect(Array.isArray(result)).toBe(true);
    });

    test('findMarkdownFiles returns list of markdown files', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), '# Changes');
      fs.mkdirSync(path.join(testDir, 'docs'));
      fs.writeFileSync(path.join(testDir, 'docs', 'API.md'), '# API');

      // Use findMarkdownFiles directly
      const mdFiles = collectors.docsPatterns.findMarkdownFiles(testDir);

      expect(Array.isArray(mdFiles)).toBe(true);
      expect(mdFiles).toContain('README.md');
      expect(mdFiles).toContain('CHANGELOG.md');
    });

    test('detects different reference types', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), `
# Utils

Import: \`import { foo } from './utils'\`
Require: \`require('./utils')\`
Path: See src/utils.js
      `);

      const result = collectors.docsPatterns.findRelatedDocs(
        ['src/utils.js'],
        { cwd: testDir }
      );

      // Should find multiple reference types
      expect(result.length).toBeGreaterThan(0);
      const doc = result.find(d => d.doc === 'README.md');
      if (doc) {
        expect(doc.referenceTypes).toBeDefined();
        expect(Array.isArray(doc.referenceTypes)).toBe(true);
      }
    });
  });

  describe('docsPatterns.checkChangelog()', () => {
    test('detects when CHANGELOG exists', () => {
      fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

## [1.0.0] - 2024-01-01
- Initial release
      `);

      // checkChangelog takes changedFiles as first arg (can be empty)
      const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

      expect(result.exists).toBe(true);
    });

    test('detects when CHANGELOG is missing', () => {
      const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

      expect(result.exists).toBe(false);
    });

    test('returns proper structure when CHANGELOG exists', () => {
      // Create a CHANGELOG
      fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

## [1.0.0] - 2020-01-01
- Old release
      `);

      const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

      expect(result).toHaveProperty('exists', true);
      // undocumented may be empty if not in a git repo
      expect(result).toHaveProperty('undocumented');
    });
  });

  describe('backward compatibility with drift-detect/collectors', () => {
    const driftDetectCollectors = require('../lib/drift-detect/collectors');

    test('exports DEFAULT_OPTIONS', () => {
      expect(driftDetectCollectors.DEFAULT_OPTIONS).toBeDefined();
      expect(driftDetectCollectors.DEFAULT_OPTIONS.sources).toEqual(['github', 'docs', 'code']);
    });

    test('exports scanGitHubState', () => {
      expect(typeof driftDetectCollectors.scanGitHubState).toBe('function');
    });

    test('exports analyzeDocumentation', () => {
      expect(typeof driftDetectCollectors.analyzeDocumentation).toBe('function');
    });

    test('exports scanCodebase', () => {
      expect(typeof driftDetectCollectors.scanCodebase).toBe('function');
    });

    test('exports collectAllData', () => {
      expect(typeof driftDetectCollectors.collectAllData).toBe('function');
    });

    test('exports isGhAvailable', () => {
      expect(typeof driftDetectCollectors.isGhAvailable).toBe('function');
    });

    test('exports isPathSafe', () => {
      expect(typeof driftDetectCollectors.isPathSafe).toBe('function');
    });

    test('isPathSafe works correctly', () => {
      expect(driftDetectCollectors.isPathSafe('README.md', testDir)).toBe(true);
      expect(driftDetectCollectors.isPathSafe('../etc/passwd', testDir)).toBe(false);
    });
  });
});
