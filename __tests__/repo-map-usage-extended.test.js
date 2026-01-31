/**
 * Extended tests for repo-map usage analyzer
 * Covers complex scenarios, edge cases, and integration tests
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

describe('repo-map usage analyzer extended', () => {
  describe('buildUsageIndex edge cases', () => {
    test('handles file with no symbols', () => {
      const repoMap = {
        files: {
          'empty.js': {
            symbols: {},
            imports: []
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      expect(index.byFile.size).toBe(0);
      // File with no exports may have an empty set or be undefined
      const exports = index.exportsByFile.get('empty.js');
      if (exports) {
        expect(exports.size).toBe(0);
      }
    });

    test('handles file with only imports, no exports', () => {
      const repoMap = {
        files: {
          'utils.js': {
            symbols: { exports: [{ name: 'helper', kind: 'function' }] },
            imports: []
          },
          'consumer.js': {
            symbols: { exports: [] },
            imports: [{ source: './utils', kind: 'named', names: ['helper'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      expect(index.byFile.get('utils.js')).toBeDefined();
      expect(index.byFile.get('utils.js').has('consumer.js')).toBe(true);
    });

    test('handles default imports', () => {
      const repoMap = {
        files: {
          'module.js': {
            symbols: { exports: [{ name: 'default', kind: 'function' }] },
            imports: []
          },
          'consumer.js': {
            symbols: { exports: [] },
            imports: [{ source: './module', kind: 'default', names: ['default'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      // Default imports use the module basename as heuristic
      // So module.js -> 'module' symbol
      expect(index.byFile.get('module.js')).toBeDefined();
      expect(index.byFile.get('module.js').has('consumer.js')).toBe(true);
    });

    test('handles namespace imports (import * as)', () => {
      const repoMap = {
        files: {
          'utils.js': {
            symbols: {
              exports: [
                { name: 'foo', kind: 'function' },
                { name: 'bar', kind: 'function' }
              ]
            },
            imports: []
          },
          'consumer.js': {
            symbols: { exports: [] },
            imports: [{ source: './utils', kind: 'namespace', names: ['*'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      // Namespace import should track file dependency
      expect(index.byFile.get('utils.js')).toBeDefined();
    });

    test('handles re-exports', () => {
      const repoMap = {
        files: {
          'internal.js': {
            symbols: { exports: [{ name: 'internal', kind: 'function' }] },
            imports: []
          },
          'index.js': {
            symbols: {
              exports: [{ name: 'internal', kind: 'function' }]
            },
            imports: [{ source: './internal', kind: 'named', names: ['internal'] }]
          },
          'consumer.js': {
            symbols: { exports: [] },
            imports: [{ source: './index', kind: 'named', names: ['internal'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      // Both internal.js and index.js should have dependents
      expect(index.byFile.get('internal.js').has('index.js')).toBe(true);
      expect(index.byFile.get('index.js').has('consumer.js')).toBe(true);
    });
  });

  describe('findUsages complex scenarios', () => {
    test('tracks multiple usages of same symbol', () => {
      const repoMap = {
        files: {
          'lib.js': {
            symbols: { exports: [{ name: 'shared', kind: 'function' }] },
            imports: []
          },
          'a.js': {
            symbols: { exports: [] },
            imports: [{ source: './lib', kind: 'named', names: ['shared'] }]
          },
          'b.js': {
            symbols: { exports: [] },
            imports: [{ source: './lib', kind: 'named', names: ['shared'] }]
          },
          'c.js': {
            symbols: { exports: [] },
            imports: [{ source: './lib', kind: 'named', names: ['shared'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);
      const usages = findUsages(index, 'lib.js', 'shared');

      expect(usages.length).toBe(3);
      expect(usages).toContain('a.js');
      expect(usages).toContain('b.js');
      expect(usages).toContain('c.js');
    });

    test('handles cross-directory imports', () => {
      const repoMap = {
        files: {
          'src/utils/helpers.js': {
            symbols: { exports: [{ name: 'helper', kind: 'function' }] },
            imports: []
          },
          'src/components/Button.js': {
            symbols: { exports: [] },
            imports: [{ source: '../utils/helpers', kind: 'named', names: ['helper'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);
      const usages = findUsages(index, 'src/utils/helpers.js', 'helper');

      expect(usages).toContain('src/components/Button.js');
    });
  });

  describe('findUnusedExports complex scenarios', () => {
    test('handles library with multiple entry points', () => {
      const repoMap = {
        files: {
          'src/index.js': {
            symbols: { exports: [{ name: 'main', kind: 'function' }] },
            imports: []
          },
          'src/cli.js': {
            symbols: { exports: [{ name: 'cli', kind: 'function' }] },
            imports: []
          },
          'src/internal.js': {
            symbols: { exports: [{ name: 'internal', kind: 'function' }] },
            imports: []
          },
          'src/main.js': {
            symbols: { exports: [] },
            imports: [{ source: './index', kind: 'named', names: ['main'] }]
          }
        }
      };

      const unused = findUnusedExports(repoMap);

      // index.js and cli.js are entry points, should not be flagged
      expect(unused.find(u => u.name === 'main')).toBeUndefined();
      expect(unused.find(u => u.name === 'cli')).toBeUndefined();

      // internal.js is not an entry point and not imported
      const internalUnused = unused.find(u => u.name === 'internal');
      expect(internalUnused).toBeDefined();
    });

    test('does not flag test files as unused', () => {
      const repoMap = {
        files: {
          'src/utils.js': {
            symbols: { exports: [{ name: 'helper', kind: 'function' }] },
            imports: []
          },
          '__tests__/utils.test.js': {
            symbols: { exports: [] },
            imports: [{ source: '../src/utils', kind: 'named', names: ['helper'] }]
          }
        }
      };

      const unused = findUnusedExports(repoMap);

      // utils.js is used by test file
      expect(unused.find(u => u.name === 'helper')).toBeUndefined();
    });
  });

  describe('findOrphanedInfrastructure complex scenarios', () => {
    test('detects unused base classes in infrastructure/', () => {
      const repoMap = {
        files: {
          'src/infrastructure/BaseRepository.js': {
            symbols: {
              exports: [{ name: 'BaseRepository', kind: 'class' }],
              classes: [{ name: 'BaseRepository', exported: true }]
            },
            imports: []
          },
          'src/repositories/UserRepository.js': {
            symbols: {
              exports: [{ name: 'UserRepository', kind: 'class' }],
              classes: [{ name: 'UserRepository', exported: true }]
            },
            imports: []  // Should extend BaseRepository but doesn't
          }
        }
      };

      const orphaned = findOrphanedInfrastructure(repoMap);

      // BaseRepository is in infrastructure/ but not used
      const baseOrphaned = orphaned.find(o => o.name === 'BaseRepository');
      expect(baseOrphaned).toBeDefined();
      expect(baseOrphaned.type).toBe('infrastructure');
    });

    test('detects unused factory functions', () => {
      const repoMap = {
        files: {
          'src/factories/createLogger.js': {
            symbols: {
              exports: [{ name: 'createLogger', kind: 'function' }],
              functions: [{ name: 'createLogger', exported: true }]
            },
            imports: []
          }
        }
      };

      const orphaned = findOrphanedInfrastructure(repoMap);

      const factoryOrphaned = orphaned.find(o => o.name === 'createLogger');
      expect(factoryOrphaned).toBeDefined();
      expect(factoryOrphaned.type).toBe('factory');
    });

    test('does not flag used infrastructure', () => {
      const repoMap = {
        files: {
          'src/infrastructure/Logger.js': {
            symbols: {
              exports: [{ name: 'Logger', kind: 'class' }],
              classes: [{ name: 'Logger', exported: true }]
            },
            imports: []
          },
          'src/app.js': {
            symbols: { exports: [] },
            imports: [{ source: './infrastructure/Logger', kind: 'named', names: ['Logger'] }]
          }
        }
      };

      const orphaned = findOrphanedInfrastructure(repoMap);

      // Logger is used in app.js
      expect(orphaned.find(o => o.name === 'Logger')).toBeUndefined();
    });
  });

  describe('getDependencyGraph complex scenarios', () => {
    test('builds graph for monorepo structure', () => {
      const repoMap = {
        files: {
          'packages/core/index.js': {
            symbols: { exports: [{ name: 'core', kind: 'function' }] },
            imports: []
          },
          'packages/utils/index.js': {
            symbols: { exports: [{ name: 'utils', kind: 'function' }] },
            imports: []
          },
          'packages/app/index.js': {
            symbols: { exports: [] },
            imports: [
              { source: '@mono/core', kind: 'named', names: ['core'] },
              { source: '@mono/utils', kind: 'named', names: ['utils'] }
            ]
          }
        }
      };

      const graph = getDependencyGraph(repoMap);

      expect(graph.nodes).toContain('packages/core/index.js');
      expect(graph.nodes).toContain('packages/utils/index.js');
      expect(graph.nodes).toContain('packages/app/index.js');
    });

    test('handles deep nesting', () => {
      const repoMap = {
        files: {
          'src/a/b/c/d/deep.js': {
            symbols: { exports: [{ name: 'deep', kind: 'function' }] },
            imports: []
          },
          'src/shallow.js': {
            symbols: { exports: [] },
            imports: [{ source: './a/b/c/d/deep', kind: 'named', names: ['deep'] }]
          }
        }
      };

      const graph = getDependencyGraph(repoMap);

      expect(graph.edges.some(e =>
        e.from === 'src/shallow.js' && e.to === 'src/a/b/c/d/deep.js'
      )).toBe(true);
    });
  });

  describe('findCircularDependencies complex scenarios', () => {
    test('detects simple A -> B -> A cycle', () => {
      const repoMap = {
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

      const cycles = findCircularDependencies(repoMap);

      expect(cycles.length).toBe(1);
      expect(cycles[0]).toContain('a.js');
      expect(cycles[0]).toContain('b.js');
    });

    test('detects A -> B -> C -> A cycle', () => {
      const repoMap = {
        files: {
          'a.js': {
            symbols: { exports: [{ name: 'A', kind: 'function' }] },
            imports: [{ source: './b', kind: 'named', names: ['B'] }]
          },
          'b.js': {
            symbols: { exports: [{ name: 'B', kind: 'function' }] },
            imports: [{ source: './c', kind: 'named', names: ['C'] }]
          },
          'c.js': {
            symbols: { exports: [{ name: 'C', kind: 'function' }] },
            imports: [{ source: './a', kind: 'named', names: ['A'] }]
          }
        }
      };

      const cycles = findCircularDependencies(repoMap);

      expect(cycles.length).toBe(1);
      // Cycle may include the return point (a -> b -> c -> a = 4 entries)
      // or just the distinct nodes (3 entries)
      expect(cycles[0].length).toBeGreaterThanOrEqual(3);
      expect(cycles[0]).toContain('a.js');
      expect(cycles[0]).toContain('b.js');
      expect(cycles[0]).toContain('c.js');
    });

    test('detects multiple independent cycles', () => {
      const repoMap = {
        files: {
          // Cycle 1: a <-> b
          'a.js': {
            symbols: { exports: [{ name: 'A', kind: 'function' }] },
            imports: [{ source: './b', kind: 'named', names: ['B'] }]
          },
          'b.js': {
            symbols: { exports: [{ name: 'B', kind: 'function' }] },
            imports: [{ source: './a', kind: 'named', names: ['A'] }]
          },
          // Cycle 2: x <-> y
          'x.js': {
            symbols: { exports: [{ name: 'X', kind: 'function' }] },
            imports: [{ source: './y', kind: 'named', names: ['Y'] }]
          },
          'y.js': {
            symbols: { exports: [{ name: 'Y', kind: 'function' }] },
            imports: [{ source: './x', kind: 'named', names: ['X'] }]
          }
        }
      };

      const cycles = findCircularDependencies(repoMap);

      expect(cycles.length).toBe(2);
    });

    test('handles self-referencing file', () => {
      const repoMap = {
        files: {
          'recursive.js': {
            symbols: { exports: [{ name: 'recurse', kind: 'function' }] },
            imports: [{ source: './recursive', kind: 'named', names: ['recurse'] }]
          }
        }
      };

      const cycles = findCircularDependencies(repoMap);

      // Self-reference is a cycle of length 1
      expect(cycles.length).toBe(1);
      expect(cycles[0]).toContain('recursive.js');
    });

    test('distinguishes cycles from valid DAG', () => {
      const repoMap = {
        files: {
          'leaf1.js': {
            symbols: { exports: [{ name: 'leaf1', kind: 'function' }] },
            imports: []
          },
          'leaf2.js': {
            symbols: { exports: [{ name: 'leaf2', kind: 'function' }] },
            imports: []
          },
          'middle.js': {
            symbols: { exports: [{ name: 'middle', kind: 'function' }] },
            imports: [
              { source: './leaf1', kind: 'named', names: ['leaf1'] },
              { source: './leaf2', kind: 'named', names: ['leaf2'] }
            ]
          },
          'root.js': {
            symbols: { exports: [] },
            imports: [
              { source: './middle', kind: 'named', names: ['middle'] },
              { source: './leaf1', kind: 'named', names: ['leaf1'] }
            ]
          }
        }
      };

      const cycles = findCircularDependencies(repoMap);

      // This is a DAG (diamond dependency), no cycles
      expect(cycles).toEqual([]);
    });
  });

  describe('integration with real-world patterns', () => {
    test('handles React component structure', () => {
      const repoMap = {
        files: {
          'src/components/Button/Button.jsx': {
            symbols: { exports: [{ name: 'Button', kind: 'function' }] },
            imports: [{ source: './Button.styles', kind: 'named', names: ['styles'] }]
          },
          'src/components/Button/Button.styles.js': {
            symbols: { exports: [{ name: 'styles', kind: 'const' }] },
            imports: []
          },
          'src/components/Button/index.js': {
            symbols: { exports: [{ name: 'Button', kind: 'function' }] },
            imports: [{ source: './Button', kind: 'named', names: ['Button'] }]
          },
          'src/App.jsx': {
            symbols: { exports: [] },
            imports: [{ source: './components/Button', kind: 'named', names: ['Button'] }]
          }
        }
      };

      const index = buildUsageIndex(repoMap);
      const graph = getDependencyGraph(repoMap);

      // All components should be connected
      expect(graph.nodes.length).toBe(4);
      expect(graph.edges.length).toBe(3);
    });

    test('handles Node.js module pattern', () => {
      const repoMap = {
        files: {
          'lib/index.js': {
            symbols: {
              exports: [
                { name: 'utils', kind: 'object' },
                { name: 'config', kind: 'object' }
              ]
            },
            imports: [
              { source: './utils', kind: 'namespace', names: ['*'] },
              { source: './config', kind: 'default', names: ['default'] }
            ]
          },
          'lib/utils/index.js': {
            symbols: { exports: [{ name: 'formatDate', kind: 'function' }] },
            imports: []
          },
          'lib/config.js': {
            symbols: { exports: [{ name: 'default', kind: 'object' }] },
            imports: []
          }
        }
      };

      const index = buildUsageIndex(repoMap);

      // lib/index.js should have dependencies
      expect(index.byFile.get('lib/utils/index.js')).toBeDefined();
      expect(index.byFile.get('lib/config.js')).toBeDefined();
    });
  });
});
