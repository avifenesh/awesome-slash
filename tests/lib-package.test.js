/**
 * @awesome-slash/lib Package Tests
 *
 * Validates the lib package structure, exports, and version consistency
 * to ensure it is publishable as a standalone npm package.
 */

const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

describe('@awesome-slash/lib package', () => {
  let libPkg;
  let rootPkg;

  beforeAll(() => {
    libPkg = require(path.join(ROOT_DIR, 'lib', 'package.json'));
    rootPkg = require(path.join(ROOT_DIR, 'package.json'));
  });

  describe('package.json structure', () => {
    it('should have correct package name', () => {
      expect(libPkg.name).toBe('@awesome-slash/lib');
    });

    it('should have a version string', () => {
      expect(typeof libPkg.version).toBe('string');
      expect(libPkg.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should use index.js as main entry point', () => {
      expect(libPkg.main).toBe('index.js');
    });

    it('should be a commonjs package', () => {
      expect(libPkg.type).toBe('commonjs');
    });

    it('should require node >= 18', () => {
      expect(libPkg.engines).toBeDefined();
      expect(libPkg.engines.node).toBe('>=18.0.0');
    });

    it('should have public publishConfig', () => {
      expect(libPkg.publishConfig).toBeDefined();
      expect(libPkg.publishConfig.access).toBe('public');
    });

    it('should have MIT license', () => {
      expect(libPkg.license).toBe('MIT');
    });

    it('should have repository with lib directory', () => {
      expect(libPkg.repository).toBeDefined();
      expect(libPkg.repository.directory).toBe('lib');
    });

    it('should have files field including JS and excluding test files', () => {
      expect(libPkg.files).toBeDefined();
      expect(libPkg.files).toContain('**/*.js');
      expect(libPkg.files).toContain('!**/*.test.js');
      // May include other patterns like **/*.json for runtime assets
    });
  });

  describe('zero dependencies', () => {
    it('should have no dependencies', () => {
      expect(libPkg.dependencies).toBeUndefined();
    });

    it('should have no devDependencies', () => {
      expect(libPkg.devDependencies).toBeUndefined();
    });

    it('should have no peerDependencies', () => {
      expect(libPkg.peerDependencies).toBeUndefined();
    });
  });

  describe('version consistency', () => {
    it('should match root package.json version', () => {
      expect(libPkg.version).toBe(rootPkg.version);
    });
  });

  describe('require resolution', () => {
    it('should resolve root require(@awesome-slash/lib)', () => {
      const lib = require('@awesome-slash/lib');
      expect(lib).toBeDefined();
      expect(typeof lib).toBe('object');
    });

    it('should export expected top-level keys', () => {
      const lib = require('@awesome-slash/lib');
      const expectedKeys = [
        'platform', 'patterns', 'state', 'utils', 'config',
        'sources', 'xplat', 'enhance', 'repoMap', 'perf',
        'collectors', 'discovery'
      ];

      for (const key of expectedKeys) {
        expect(lib[key]).toBeDefined();
      }
    });

    it('should resolve subpath require(@awesome-slash/lib/cross-platform)', () => {
      const crossPlatform = require('@awesome-slash/lib/cross-platform');
      expect(crossPlatform).toBeDefined();
      expect(crossPlatform.PLATFORMS).toBeDefined();
    });

    it('should resolve nested subpath require(@awesome-slash/lib/enhance/agent-patterns)', () => {
      const agentPatterns = require('@awesome-slash/lib/enhance/agent-patterns');
      expect(agentPatterns).toBeDefined();
      expect(agentPatterns.agentPatterns).toBeDefined();
    });

    it('should resolve require(@awesome-slash/lib/sources/custom-handler)', () => {
      const customHandler = require('@awesome-slash/lib/sources/custom-handler');
      expect(customHandler).toBeDefined();
      expect(customHandler.SOURCE_TYPES).toBeDefined();
    });

    it('should resolve require(@awesome-slash/lib/collectors)', () => {
      const collectors = require('@awesome-slash/lib/collectors');
      expect(collectors).toBeDefined();
      expect(typeof collectors.collect).toBe('function');
    });
  });

  describe('index.js entry point', () => {
    it('should exist', () => {
      const indexPath = path.join(ROOT_DIR, 'lib', 'index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });
});
