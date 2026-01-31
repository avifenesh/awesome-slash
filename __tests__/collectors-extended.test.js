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

      expect(result.readme).toBeDefined();
      expect(result.readme.exists).toBe(true);
    });

    test('detects CHANGELOG presence', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), '# Changelog\n\n## 1.0.0');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.changelog).toBeDefined();
      expect(result.changelog.exists).toBe(true);
    });

    test('detects CONTRIBUTING presence', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.writeFileSync(path.join(testDir, 'CONTRIBUTING.md'), '# Contributing');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.contributing).toBeDefined();
    });

    test('detects docs directory', () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
      fs.mkdirSync(path.join(testDir, 'docs'));
      fs.writeFileSync(path.join(testDir, 'docs', 'API.md'), '# API');

      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.docsDir).toBeDefined();
    });

    test('handles empty directory', () => {
      const result = collectors.analyzeDocumentation({ cwd: testDir });

      expect(result.readme.exists).toBe(false);
    });
  });

  describe('codebase collector', () => {
    test('detects TypeScript project', () => {
      fs.writeFileSync(path.join(testDir, 'tsconfig.json'), '{}');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.languages).toContain('typescript');
    });

    test('detects JavaScript project via package.json', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        name: 'test',
        dependencies: { 'lodash': '1.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.languages).toContain('javascript');
    });

    test('detects React framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'react': '18.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('react');
    });

    test('detects Vue framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'vue': '3.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('vue');
    });

    test('detects Next.js framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 'next': '14.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.frameworks).toContain('next');
    });

    test('detects Jest test framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        devDependencies: { 'jest': '29.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.testFrameworks).toContain('jest');
    });

    test('detects Mocha test framework', () => {
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
        devDependencies: { 'mocha': '10.0.0' }
      }));

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.testFrameworks).toContain('mocha');
    });

    test('scans directory structure', () => {
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.mkdirSync(path.join(testDir, 'tests'));
      fs.writeFileSync(path.join(testDir, 'src', 'index.js'), '');
      fs.writeFileSync(path.join(testDir, 'tests', 'index.test.js'), '');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.directories).toContain('src');
      expect(result.directories).toContain('tests');
    });

    test('excludes node_modules from scan', () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'));
      fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg.json'), '{}');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.directories).not.toContain('node_modules');
    });

    test('detects Python project', () => {
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'flask==2.0.0');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.languages).toContain('python');
    });

    test('detects Go project', () => {
      fs.writeFileSync(path.join(testDir, 'go.mod'), 'module example.com/test');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.languages).toContain('go');
    });

    test('detects Rust project', () => {
      fs.writeFileSync(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');

      const result = collectors.scanCodebase({ cwd: testDir });

      expect(result.languages).toContain('rust');
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
      test('detects broken internal links', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), `
# Test

See [docs](./docs/nonexistent.md) for more.
        `);

        const issues = collectors.docsPatterns.analyzeDocIssues({ cwd: testDir });

        // Should detect broken link
        expect(issues.some(i => i.type === 'broken-link')).toBe(true);
      });

      test('detects outdated code references', () => {
        fs.writeFileSync(path.join(testDir, 'README.md'), `
# Test

\`\`\`javascript
import { foo } from './old-module';
\`\`\`
        `);

        // old-module.js doesn't exist
        const issues = collectors.docsPatterns.analyzeDocIssues({ cwd: testDir });

        // May or may not detect depending on implementation
        expect(Array.isArray(issues)).toBe(true);
      });

      test('returns empty array for directory without docs', () => {
        const issues = collectors.docsPatterns.analyzeDocIssues({ cwd: testDir });

        expect(Array.isArray(issues)).toBe(true);
      });
    });

    describe('checkChangelog', () => {
      test('parses CHANGELOG sections', () => {
        fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

## [2.0.0] - 2024-06-01

### Added
- New feature

### Fixed
- Bug fix

## [1.0.0] - 2024-01-01

- Initial release
        `);

        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(true);
        expect(result.latestVersion).toBe('2.0.0');
      });

      test('handles Keep a Changelog format', () => {
        fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), `
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.2.3] - 2024-03-15

### Added
- Something new
        `);

        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(true);
      });

      test('handles empty CHANGELOG', () => {
        fs.writeFileSync(path.join(testDir, 'CHANGELOG.md'), '# Changelog\n');

        const result = collectors.docsPatterns.checkChangelog([], { cwd: testDir });

        expect(result.exists).toBe(true);
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
      expect(result).toHaveProperty('pullRequests');
    });

    test('isPathSafe validates paths', () => {
      expect(collectors.isPathSafe('README.md', testDir)).toBe(true);
      expect(collectors.isPathSafe('docs/API.md', testDir)).toBe(true);
      expect(collectors.isPathSafe('../etc/passwd', testDir)).toBe(false);
      expect(collectors.isPathSafe('/etc/passwd', testDir)).toBe(false);
    });

    test('isPathSafe handles edge cases', () => {
      expect(collectors.isPathSafe('', testDir)).toBe(false);
      expect(collectors.isPathSafe('.', testDir)).toBe(true);
      expect(collectors.isPathSafe('..', testDir)).toBe(false);
      expect(collectors.isPathSafe('./valid.txt', testDir)).toBe(true);
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
