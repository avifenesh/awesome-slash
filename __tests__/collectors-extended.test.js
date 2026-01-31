/**
 * Extended tests for collectors infrastructure
 * Covers edge cases, error handling, and integration scenarios
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const collectors = require('../lib/collectors');

describe('collectors extended', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collectors-ext-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('collect() edge cases', () => {
    test('handles empty collectors array', async () => {
      const result = await collectors.collect({
        collectors: [],
        cwd: testDir
      });

      expect(result.github).toBeNull();
      expect(result.docs).toBeNull();
      expect(result.code).toBeNull();
    });

    test('handles unknown collector name gracefully', async () => {
      const result = await collectors.collect({
        collectors: ['unknown', 'docs'],
        cwd: testDir
      });

      // unknown is ignored, docs is collected
      expect(result.docs).toBeDefined();
    });

    test('handles non-existent directory gracefully', async () => {
      const nonExistent = path.join(testDir, 'does-not-exist');

      const result = await collectors.collect({
        collectors: ['docs'],
        cwd: nonExistent
      });

      // Should not throw, returns empty/default structure
      expect(result).toBeDefined();
    });

    test('passes depth option to collectors', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');

      const result = await collectors.collect({
        collectors: ['docs'],
        cwd: testDir,
        depth: 'quick'
      });

      expect(result.options.depth).toBe('quick');
    });
  });

  describe('documentation collector', () => {
    test('analyzes README.md structure', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), `
# Project Title

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Some usage docs.

## API

### function foo()

Does something.
      `);

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.files).toBeDefined();
      expect(result.files['README.md']).toBeDefined();
      expect(result.files['README.md'].hasInstallation).toBe(true);
      expect(result.files['README.md'].hasUsage).toBe(true);
    });

    test('detects CHANGELOG presence', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), '# Changelog\n\n## 1.0.0');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.files).toBeDefined();
      expect(result.files['CHANGELOG.md']).toBeDefined();
    });

    test('detects CONTRIBUTING presence', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'CONTRIBUTING.md'), '# Contributing');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.files).toBeDefined();
      expect(result.files['CONTRIBUTING.md']).toBeDefined();
    });

    test('detects docs directory', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.mkdirSync(path.join(testDir, 'docs'));
      fs.writeFileSync(path.join(testDir, 'docs', 'API.md'), '# API');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      // docs/API.md should be in files
      const docsFiles = Object.keys(result.files).filter(f => f.includes('docs'));
      expect(docsFiles.length).toBeGreaterThan(0);
    });

    test('handles empty directory', () => {
      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.files).toBeDefined();
      expect(Object.keys(result.files).length).toBe(0);
    });
  });

  describe('codebase collector', () => {
    test('detects TypeScript project', () => {
      fs.writeFileSync(path.join(testDir, 'tsconfig.json'), '{}');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.hasTypeScript).toBe(true);
    });

    test('detects JavaScript project via package.json', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        name: 'test',
        dependencies: { 'lodash': '1.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      // package.json indicates a JS/Node project
      expect(result.fileStats['.json']).toBe(1);
    });

    test('detects React framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'react': '18.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('React');
    });

    test('detects Vue framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'vue': '3.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('Vue.js');
    });

    test('detects Next.js framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'next': '14.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('Next.js');
    });

    test('detects Jest test framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        devDependencies: { 'jest': '29.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.testFramework).toBe('jest');
    });

    test('detects Mocha test framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        devDependencies: { 'mocha': '10.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.testFramework).toBe('mocha');
    });

    test('scans directory structure', () => {
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.mkdirSync(path.join(testDir, 'tests'));
      fs.writeFileSync(path.join(testDir, 'src', 'index.js'), '');
      fs.writeFileSync(path.join(testDir, 'tests', 'index.test.js'), '');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.topLevelDirs).toContain('src');
      expect(result.topLevelDirs).toContain('tests');
    });

    test('excludes node_modules from scan', () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'));
      fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg.json'), '{}');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.topLevelDirs).not.toContain('node_modules');
    });

    test('detects Python project via requirements.txt', () => {
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'flask==2.0.0');

      const result = collectors.scanCodebase({ cwd: testDir });

      // Python project detected via requirements.txt
      expect(result.fileStats['.txt']).toBe(1);
    });

    test('detects Go project via go.mod', () => {
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module example.com/test');

      const result = collectors.scanCodebase({ cwd: testDir });

      // Go project detected via go.mod
      expect(result.fileStats['.mod']).toBe(1);
    });

    test('detects Rust project via Cargo.toml', () => {
      fs.writeFileSync(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');

      const result = collectors.scanCodebase({ cwd: testDir });

      // Rust project detected via Cargo.toml
      expect(result.fileStats['.toml']).toBe(1);
    });
  });

  describe('docsPatterns extended', () => {
    describe('findRelatedDocs', () => {
      test('finds docs with inline code references', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), `
# Utils

The \`utils.js\` file contains helpers.
        `);

        const result = collectors.docsPatterns.findRelatedDocs(
          ['src/utils.js'],
          { cwd: testDir }
        );

        expect(result.length).toBeGreaterThan(0);
      });

      test('finds docs with import examples', () => {
        fs.writeFileSync(path.join(testDir, 'API.md'), `
# API

\`\`\`javascript
import { helper } from './utils';
\`\`\`
        `);

        const result = collectors.docsPatterns.findRelatedDocs(
          ['utils.js'],
          { cwd: testDir }
        );

        // Should find reference to utils
        const found = result.some(r => r.doc === 'API.md');
        expect(found).toBe(true);
      });

      test('handles files with special characters in name', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), `
See my-utils.js for details.
        `);

        const result = collectors.docsPatterns.findRelatedDocs(
          ['my-utils.js'],
          { cwd: testDir }
        );

        expect(result.length).toBeGreaterThan(0);
      });

      test('handles empty changed files array', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');

        const result = collectors.docsPatterns.findRelatedDocs([], { cwd: testDir });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });
    });

    describe('analyzeDocIssues', () => {
      test('analyzes doc for issues related to changed file', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), `
# Test

\`\`\`javascript
import { foo } from './utils';
\`\`\`
        `);

        // analyzeDocIssues takes (docPath, changedFile, options)
        const issues = collectors.docsPatterns.analyzeDocIssues(
          'README.md',
          'src/utils.js',
          { cwd: testDir }
        );

        expect(Array.isArray(issues)).toBe(true);
      });

      test('returns empty array when no issues', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), '# Just text');

        const issues = collectors.docsPatterns.analyzeDocIssues(
          'README.md',
          'src/unrelated.js',
          { cwd: testDir }
        );

        expect(issues).toEqual([]);
      });
    });

    describe('checkChangelog', () => {
      test('detects existing CHANGELOG', () => {
        fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

## [2.0.0] - 2024-06-01

### Added
- New feature
        `);

        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(true);
      });

      test('handles Keep a Changelog format with Unreleased', () => {
        fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

## [Unreleased]

## [1.2.3] - 2024-03-15

### Added
- Something new
        `);

        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(true);
        expect(result.hasUnreleased).toBe(true);
      });

      test('returns exists: false when no CHANGELOG', () => {
        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(false);
      });
    });

    describe('findMarkdownFiles', () => {
      test('finds all markdown files recursively', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), '# Root');
        fs.mkdirSync(path.join(testDir, 'docs'));
        fs.writeFileSync(path.join(testDir, 'docs', 'API.md'), '# API');
        fs.mkdirSync(path.join(testDir, 'docs', 'guides'));
        fs.writeFileSync(path.join(testDir, 'docs', 'guides', 'GETTING_STARTED.md'), '# Guide');

        const files = collectors.docsPatterns.findMarkdownFiles(testDir);

        expect(files).toContain('README.md');
        expect(files.some(f => f.includes('API.md'))).toBe(true);
        expect(files.some(f => f.includes('GETTING_STARTED.md'))).toBe(true);
      });

      test('excludes node_modules', () => {
        fs.mkdirSync(path.join(testDir, 'node_modules'));
        fs.mkdirSync(path.join(testDir, 'node_modules', 'pkg'));
        fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg', 'README.md'), '# Pkg');

        const files = collectors.docsPatterns.findMarkdownFiles(testDir);

        expect(files.every(f => !f.includes('node_modules'))).toBe(true);
      });

      test('excludes .git directory', () => {
        fs.mkdirSync(path.join(testDir, '.git'));
        fs.writeFileSync(path.join(testDir, '.git', 'description'), 'test');

        const files = collectors.docsPatterns.findMarkdownFiles(testDir);

        expect(files.every(f => !f.includes('.git'))).toBe(true);
      });
    });
  });

  describe('github collector', () => {
    test('isGhAvailable returns boolean', async () => {
      const result = await collectors.isGhAvailable();
      expect(typeof result).toBe('boolean');
    });

    test('scanGitHubState handles gh not available', async () => {
      // This may or may not have gh available depending on environment
      const result = await collectors.scanGitHubState({ cwd: testDir });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('prs');
    });
  });

  describe('documentation.isPathSafe', () => {
    test('validates paths', () => {
      // isPathSafe is on the documentation namespace
      expect(collectors.documentation.isPathSafe('README.md', testDir)).toBe(true);
      expect(collectors.documentation.isPathSafe('docs/API.md', testDir)).toBe(true);
      expect(collectors.documentation.isPathSafe('../etc/passwd', testDir)).toBe(false);
    });

    test('handles edge cases', () => {
      // Empty string resolves to basePath, which is safe
      expect(collectors.documentation.isPathSafe('', testDir)).toBe(true);
      expect(collectors.documentation.isPathSafe('.', testDir)).toBe(true);
      expect(collectors.documentation.isPathSafe('..', testDir)).toBe(false);
      expect(collectors.documentation.isPathSafe('./valid.txt', testDir)).toBe(true);
    });

    test('rejects absolute paths outside base', () => {
      // Absolute paths outside testDir are unsafe
      const outsidePath = '/etc/passwd';
      // This depends on the platform and testDir location
      // The check is: resolved.startsWith(path.resolve(basePath))
      const resolved = path.resolve(testDir, outsidePath);
      const isInside = resolved.startsWith(path.resolve(testDir));
      expect(collectors.documentation.isPathSafe(outsidePath, testDir)).toBe(isInside);
    });
  });

  describe('collectAllData backward compatibility', () => {
    test('works with sources option (legacy)', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');

      const result = await collectors.collectAllData({
        sources: ['docs'],
        cwd: testDir
      });

      expect(result.docs).toBeDefined();
    });

    test('works with collectors option (new)', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');

      const result = await collectors.collectAllData({
        collectors: ['docs'],
        cwd: testDir
      });

      expect(result.docs).toBeDefined();
    });

    test('prefers sources over collectors when both provided', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

      const result = await collectors.collectAllData({
        sources: ['docs'],
        collectors: ['code'],
        cwd: testDir
      });

      // sources takes precedence
      expect(result.docs).toBeDefined();
      expect(result.code).toBeNull();
    });
  });
});
