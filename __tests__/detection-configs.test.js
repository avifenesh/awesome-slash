/**
 * Tests for detection-configs.js
 * Validates configuration constants used for platform detection
 */

const {
  CI_CONFIGS,
  DEPLOYMENT_CONFIGS,
  PROJECT_TYPE_CONFIGS,
  PACKAGE_MANAGER_CONFIGS,
  BRANCH_STRATEGIES,
  MAIN_BRANCH_CANDIDATES
} = require('../lib/platform/detection-configs');

describe('detection-configs', () => {
  describe('CI_CONFIGS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CI_CONFIGS)).toBe(true);
      expect(CI_CONFIGS.length).toBeGreaterThan(0);
    });

    it('should have file and platform properties for each entry', () => {
      CI_CONFIGS.forEach((config, index) => {
        expect(config).toHaveProperty('file');
        expect(config).toHaveProperty('platform');
        expect(typeof config.file).toBe('string');
        expect(typeof config.platform).toBe('string');
        expect(config.file.length).toBeGreaterThan(0);
        expect(config.platform.length).toBeGreaterThan(0);
      });
    });

    it('should include common CI platforms', () => {
      const platforms = CI_CONFIGS.map(c => c.platform);
      expect(platforms).toContain('github-actions');
      expect(platforms).toContain('gitlab-ci');
      expect(platforms).toContain('circleci');
      expect(platforms).toContain('jenkins');
      expect(platforms).toContain('travis');
    });

    it('should have github-actions first (highest priority)', () => {
      expect(CI_CONFIGS[0].platform).toBe('github-actions');
      expect(CI_CONFIGS[0].file).toBe('.github/workflows');
    });

    it('should have unique platform names within file matches', () => {
      const platformFiles = new Map();
      CI_CONFIGS.forEach(config => {
        if (!platformFiles.has(config.file)) {
          platformFiles.set(config.file, config.platform);
        }
      });
      // Each unique file should map to one platform
      expect(platformFiles.size).toBe(CI_CONFIGS.length);
    });
  });

  describe('DEPLOYMENT_CONFIGS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(DEPLOYMENT_CONFIGS)).toBe(true);
      expect(DEPLOYMENT_CONFIGS.length).toBeGreaterThan(0);
    });

    it('should have file and platform properties for each entry', () => {
      DEPLOYMENT_CONFIGS.forEach(config => {
        expect(config).toHaveProperty('file');
        expect(config).toHaveProperty('platform');
        expect(typeof config.file).toBe('string');
        expect(typeof config.platform).toBe('string');
        expect(config.file.length).toBeGreaterThan(0);
        expect(config.platform.length).toBeGreaterThan(0);
      });
    });

    it('should include common deployment platforms', () => {
      const platforms = DEPLOYMENT_CONFIGS.map(c => c.platform);
      expect(platforms).toContain('railway');
      expect(platforms).toContain('vercel');
      expect(platforms).toContain('netlify');
      expect(platforms).toContain('fly');
    });

    it('should have railway first (highest priority)', () => {
      expect(DEPLOYMENT_CONFIGS[0].platform).toBe('railway');
    });

    it('should support both railway.json and railway.toml', () => {
      const railwayConfigs = DEPLOYMENT_CONFIGS.filter(c => c.platform === 'railway');
      const railwayFiles = railwayConfigs.map(c => c.file);
      expect(railwayFiles).toContain('railway.json');
      expect(railwayFiles).toContain('railway.toml');
    });

    it('should support both netlify.toml and .netlify', () => {
      const netlifyConfigs = DEPLOYMENT_CONFIGS.filter(c => c.platform === 'netlify');
      const netlifyFiles = netlifyConfigs.map(c => c.file);
      expect(netlifyFiles).toContain('netlify.toml');
      expect(netlifyFiles).toContain('.netlify');
    });
  });

  describe('PROJECT_TYPE_CONFIGS', () => {
    it('should have dependencies array', () => {
      expect(PROJECT_TYPE_CONFIGS).toHaveProperty('dependencies');
      expect(Array.isArray(PROJECT_TYPE_CONFIGS.dependencies)).toBe(true);
      expect(PROJECT_TYPE_CONFIGS.dependencies.length).toBeGreaterThan(0);
    });

    it('should have name and type for each dependency', () => {
      PROJECT_TYPE_CONFIGS.dependencies.forEach(dep => {
        expect(dep).toHaveProperty('name');
        expect(dep).toHaveProperty('type');
        expect(typeof dep.name).toBe('string');
        expect(typeof dep.type).toBe('string');
        expect(dep.name.length).toBeGreaterThan(0);
        expect(dep.type.length).toBeGreaterThan(0);
      });
    });

    it('should include common frameworks', () => {
      const depNames = PROJECT_TYPE_CONFIGS.dependencies.map(d => d.name);
      expect(depNames).toContain('next');
      expect(depNames).toContain('react');
      expect(depNames).toContain('vue');
      expect(depNames).toContain('express');
    });

    it('should include common framework types', () => {
      const types = PROJECT_TYPE_CONFIGS.dependencies.map(d => d.type);
      expect(types).toContain('nextjs');
      expect(types).toContain('react');
      expect(types).toContain('vue');
      expect(types).toContain('express');
    });

    it('should have unique dependency names', () => {
      const names = PROJECT_TYPE_CONFIGS.dependencies.map(d => d.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('PACKAGE_MANAGER_CONFIGS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(PACKAGE_MANAGER_CONFIGS)).toBe(true);
      expect(PACKAGE_MANAGER_CONFIGS.length).toBeGreaterThan(0);
    });

    it('should have file and manager properties for each entry', () => {
      PACKAGE_MANAGER_CONFIGS.forEach(config => {
        expect(config).toHaveProperty('file');
        expect(config).toHaveProperty('manager');
        expect(typeof config.file).toBe('string');
        expect(typeof config.manager).toBe('string');
        expect(config.file.length).toBeGreaterThan(0);
        expect(config.manager.length).toBeGreaterThan(0);
      });
    });

    it('should include common Node.js package managers', () => {
      const managers = PACKAGE_MANAGER_CONFIGS.map(c => c.manager);
      expect(managers).toContain('npm');
      expect(managers).toContain('yarn');
      expect(managers).toContain('pnpm');
      expect(managers).toContain('bun');
    });

    it('should include non-Node package managers', () => {
      const managers = PACKAGE_MANAGER_CONFIGS.map(c => c.manager);
      expect(managers).toContain('cargo');
      expect(managers).toContain('go');
      expect(managers).toContain('poetry');
    });

    it('should have pnpm first among Node.js managers (priority order)', () => {
      const nodeManagers = PACKAGE_MANAGER_CONFIGS.filter(c =>
        ['pnpm', 'yarn', 'npm', 'bun'].includes(c.manager)
      );
      expect(nodeManagers[0].manager).toBe('pnpm');
    });

    it('should map to correct lockfiles', () => {
      const fileToManager = Object.fromEntries(
        PACKAGE_MANAGER_CONFIGS.map(c => [c.file, c.manager])
      );
      expect(fileToManager['pnpm-lock.yaml']).toBe('pnpm');
      expect(fileToManager['yarn.lock']).toBe('yarn');
      expect(fileToManager['package-lock.json']).toBe('npm');
      expect(fileToManager['bun.lockb']).toBe('bun');
      expect(fileToManager['Cargo.lock']).toBe('cargo');
      expect(fileToManager['go.sum']).toBe('go');
    });
  });

  describe('BRANCH_STRATEGIES', () => {
    it('should be an object with strategy keys', () => {
      expect(typeof BRANCH_STRATEGIES).toBe('object');
      expect(BRANCH_STRATEGIES).not.toBeNull();
    });

    it('should have gitflow strategy', () => {
      expect(BRANCH_STRATEGIES).toHaveProperty('gitflow');
      expect(Array.isArray(BRANCH_STRATEGIES.gitflow)).toBe(true);
      expect(BRANCH_STRATEGIES.gitflow).toContain('develop');
    });

    it('should have githubflow strategy', () => {
      expect(BRANCH_STRATEGIES).toHaveProperty('githubflow');
      expect(Array.isArray(BRANCH_STRATEGIES.githubflow)).toBe(true);
      expect(BRANCH_STRATEGIES.githubflow).toContain('main');
    });

    it('should have trunkbased strategy', () => {
      expect(BRANCH_STRATEGIES).toHaveProperty('trunkbased');
      expect(Array.isArray(BRANCH_STRATEGIES.trunkbased)).toBe(true);
      expect(BRANCH_STRATEGIES.trunkbased).toContain('trunk');
    });

    it('should have branches as string arrays', () => {
      Object.values(BRANCH_STRATEGIES).forEach(branches => {
        expect(Array.isArray(branches)).toBe(true);
        branches.forEach(branch => {
          expect(typeof branch).toBe('string');
          expect(branch.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('MAIN_BRANCH_CANDIDATES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(MAIN_BRANCH_CANDIDATES)).toBe(true);
      expect(MAIN_BRANCH_CANDIDATES.length).toBeGreaterThan(0);
    });

    it('should include main and master', () => {
      expect(MAIN_BRANCH_CANDIDATES).toContain('main');
      expect(MAIN_BRANCH_CANDIDATES).toContain('master');
    });

    it('should have main first (modern convention)', () => {
      expect(MAIN_BRANCH_CANDIDATES[0]).toBe('main');
    });

    it('should have all strings', () => {
      MAIN_BRANCH_CANDIDATES.forEach(branch => {
        expect(typeof branch).toBe('string');
        expect(branch.length).toBeGreaterThan(0);
      });
    });

    it('should have unique entries', () => {
      const unique = new Set(MAIN_BRANCH_CANDIDATES);
      expect(unique.size).toBe(MAIN_BRANCH_CANDIDATES.length);
    });
  });

  describe('config consistency', () => {
    it('should not have file paths with leading slashes', () => {
      const allFiles = [
        ...CI_CONFIGS.map(c => c.file),
        ...DEPLOYMENT_CONFIGS.map(c => c.file),
        ...PACKAGE_MANAGER_CONFIGS.map(c => c.file)
      ];
      allFiles.forEach(file => {
        expect(file.startsWith('/')).toBe(false);
        expect(file.startsWith('\\')).toBe(false);
      });
    });

    it('should use lowercase for platform/manager names', () => {
      const allNames = [
        ...CI_CONFIGS.map(c => c.platform),
        ...DEPLOYMENT_CONFIGS.map(c => c.platform),
        ...PACKAGE_MANAGER_CONFIGS.map(c => c.manager)
      ];
      allNames.forEach(name => {
        expect(name).toBe(name.toLowerCase());
      });
    });
  });
});
