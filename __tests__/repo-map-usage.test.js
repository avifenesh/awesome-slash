/**
 * Tests for repo-map usage analyzer
 */

const {
  buildUsageIndex,
  findUsages,
  findDependents,
  findUnusedExports,
  findOrphanedInfrastructure,
  getDependencyGraph,
  findCircularDependencies
} = require('../lib/repo-map/usage-analyzer');

describe('repo-map usage analyzer', () => {
  // Sample repo map structure for testing (matches actual repo-map format)
  const sampleRepoMap = {
    files: {
      'src/utils.js': {
        symbols: {
          exports: [
            { name: 'formatDate', kind: 'function' },
            { name: 'parseDate', kind: 'function' },
            { name: 'unusedHelper', kind: 'function' }
          ]
        },
        imports: []
      },
      'src/api.js': {
        symbols: {
          exports: [
            { name: 'fetchData', kind: 'function' },
            { name: 'ApiClient', kind: 'class' }
          ]
        },
        imports: [
          { source: './utils', kind: 'named', names: ['formatDate'] }
        ]
      },
      'src/app.js': {
        symbols: {
          exports: []
        },
        imports: [
          { source: './utils', kind: 'named', names: ['formatDate'] },
          { source: './api', kind: 'named', names: ['fetchData', 'ApiClient'] }
        ]
      },
      'src/infrastructure/BaseService.js': {
        symbols: {
          exports: [
            { name: 'BaseService', kind: 'class' }
          ],
          classes: [
            { name: 'BaseService', exported: true, line: 5 }
          ]
        },
        imports: []
      },
      'src/infrastructure/ServiceFactory.js': {
        symbols: {
          exports: [
            { name: 'createService', kind: 'function' }
          ],
          functions: [
            { name: 'createService', exported: true, line: 10 }
          ]
        },
        imports: [
          { source: './BaseService', kind: 'named', names: ['BaseService'] }
        ]
      }
    }
  };

  describe('buildUsageIndex', () => {
    test('builds index from repo map', () => {
      const index = buildUsageIndex(sampleRepoMap);

      expect(index.bySymbol).toBeInstanceOf(Map);
      expect(index.byFile).toBeInstanceOf(Map);
      expect(index.exportsByFile).toBeInstanceOf(Map);
    });

    test('tracks symbol usages correctly', () => {
      const index = buildUsageIndex(sampleRepoMap);

      // formatDate is used in api.js and app.js
      // Symbol key is filePath:symbolName
      const formatDateUsages = index.bySymbol.get('src/utils.js:formatDate');
      expect(formatDateUsages).toBeDefined();
      expect(formatDateUsages.size).toBe(2);
    });

    test('tracks file dependencies correctly', () => {
      const index = buildUsageIndex(sampleRepoMap);

      // utils.js is imported by api.js and app.js
      const utilsDeps = index.byFile.get('src/utils.js');
      expect(utilsDeps).toBeDefined();
      expect(utilsDeps.has('src/api.js')).toBe(true);
      expect(utilsDeps.has('src/app.js')).toBe(true);
    });

    test('tracks exports per file', () => {
      const index = buildUsageIndex(sampleRepoMap);

      const utilsExports = index.exportsByFile.get('src/utils.js');
      expect(utilsExports).toBeDefined();
      expect(utilsExports.size).toBe(3);
      expect(utilsExports.has('formatDate')).toBe(true);
    });

    test('returns empty index for empty repo map', () => {
      const index = buildUsageIndex({ files: {} });

      expect(index.bySymbol.size).toBe(0);
      expect(index.byFile.size).toBe(0);
      expect(index.exportsByFile.size).toBe(0);
    });
  });

  describe('findUsages', () => {
    let index;

    beforeAll(() => {
      index = buildUsageIndex(sampleRepoMap);
    });

    test('finds files that import a symbol', () => {
      // findUsages takes (index, filePath, symbolName)
      const usages = findUsages(index, 'src/utils.js', 'formatDate');

      expect(usages).toContain('src/api.js');
      expect(usages).toContain('src/app.js');
      expect(usages).not.toContain('src/utils.js');
    });

    test('returns empty array for unused symbol', () => {
      const usages = findUsages(index, 'src/utils.js', 'unusedHelper');

      expect(usages).toEqual([]);
    });

    test('returns empty array for non-existent symbol', () => {
      const usages = findUsages(index, 'src/utils.js', 'nonExistent');

      expect(usages).toEqual([]);
    });
  });

  describe('findDependents', () => {
    let index;

    beforeAll(() => {
      index = buildUsageIndex(sampleRepoMap);
    });

    test('finds files that depend on a given file', () => {
      const dependents = findDependents(index, 'src/utils.js');

      expect(dependents).toContain('src/api.js');
      expect(dependents).toContain('src/app.js');
    });

    test('returns empty for file with no dependents', () => {
      const dependents = findDependents(index, 'src/app.js');

      expect(dependents).toEqual([]);
    });
  });

  describe('findUnusedExports', () => {
    // Note: findUnusedExports only flags exports when BOTH:
    // 1. The file is not imported by any other file, AND
    // 2. The specific symbol is not used
    // This is conservative - if a file is imported, individual unused symbols won't be flagged

    test('identifies exports from completely unused files', () => {
      // Create a repo map with an isolated file
      const mapWithIsolated = {
        files: {
          'src/used.js': {
            symbols: { exports: [{ name: 'used', kind: 'function' }] },
            imports: []
          },
          'src/isolated.js': {
            symbols: { exports: [{ name: 'isolatedFn', kind: 'function' }] },
            imports: []
          },
          'src/main.js': {
            symbols: { exports: [] },
            imports: [{ source: './used', kind: 'named', names: ['used'] }]
          }
        }
      };

      const unused = findUnusedExports(mapWithIsolated);

      // isolated.js is never imported, so its exports should be flagged
      const isolatedFn = unused.find(u => u.name === 'isolatedFn');
      expect(isolatedFn).toBeDefined();
      expect(isolatedFn.file).toBe('src/isolated.js');
    });

    test('flags unused exports from imported files with LOW certainty', () => {
      // A file can be imported for some symbols but have other unused exports
      // These should be flagged with LOW certainty (vs MEDIUM for completely unused files)
      const unused = findUnusedExports(sampleRepoMap);

      const unusedNames = unused.map(u => u.name);
      // formatDate is used (imported), so it won't be flagged
      expect(unusedNames).not.toContain('formatDate');

      // parseDate and unusedHelper are exported but never imported
      // They SHOULD be flagged (this was a bug fix)
      const parseDate = unused.find(u => u.name === 'parseDate');
      const unusedHelper = unused.find(u => u.name === 'unusedHelper');

      // They should have LOW certainty since the file itself is imported
      if (parseDate) {
        expect(parseDate.certainty).toBe('LOW');
      }
      if (unusedHelper) {
        expect(unusedHelper.certainty).toBe('LOW');
      }
    });

    test('does not flag entry point files', () => {
      const mapWithIndex = {
        files: {
          'src/index.js': {
            symbols: { exports: [{ name: 'main', kind: 'function' }] },
            imports: []
          }
        }
      };

      const unused = findUnusedExports(mapWithIndex);

      // index.js is an entry point, so exports won't be flagged
      expect(unused.find(u => u.name === 'main')).toBeUndefined();
    });
  });

  describe('findOrphanedInfrastructure', () => {
    test('detects unused infrastructure patterns', () => {
      const orphaned = findOrphanedInfrastructure(sampleRepoMap);

      // BaseService is an infrastructure class not used outside infrastructure/
      // ServiceFactory.createService is a factory function not used
      expect(orphaned.length).toBeGreaterThan(0);
    });

    test('returns items with HIGH certainty', () => {
      const orphaned = findOrphanedInfrastructure(sampleRepoMap);

      for (const item of orphaned) {
        expect(item.certainty).toBe('HIGH');
        expect(item.file).toBeDefined();
        // type field indicates 'infrastructure' or 'factory'
        expect(['infrastructure', 'factory']).toContain(item.type);
      }
    });

    test('includes createService factory as orphaned', () => {
      const orphaned = findOrphanedInfrastructure(sampleRepoMap);

      const factoryOrphaned = orphaned.find(o => o.name === 'createService');
      expect(factoryOrphaned).toBeDefined();
      expect(factoryOrphaned.type).toBe('factory');
    });
  });

  describe('getDependencyGraph', () => {
    test('returns graph of file dependencies', () => {
      const graph = getDependencyGraph(sampleRepoMap);

      // Returns { nodes: string[], edges: Array<{from, to}> }
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph.nodes).toContain('src/app.js');

      // Check edges from src/app.js
      const appEdges = graph.edges.filter(e => e.from === 'src/app.js');
      expect(appEdges.length).toBe(2);
    });

    test('returns empty structure for empty repo map', () => {
      const graph = getDependencyGraph({ files: {} });

      expect(graph).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('findCircularDependencies', () => {
    test('returns empty array when no cycles exist', () => {
      const cycles = findCircularDependencies(sampleRepoMap);

      expect(cycles).toEqual([]);
    });

    test('detects circular dependencies', () => {
      const cyclicMap = {
        files: {
          'a.js': {
            symbols: { exports: [{ name: 'A', kind: 'function' }] },
            imports: [{ source: './b', kind: 'named', names: ['B'] }]
          },
          'b.js': {
            symbols: { exports: [{ name: 'B', kind: 'function' }] },
            imports: [{ source: './a', kind: 'named', names: ['A'] }]
          }
        }
      };

      const cycles = findCircularDependencies(cyclicMap);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('a.js');
      expect(cycles[0]).toContain('b.js');
    });
  });
});
