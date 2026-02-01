/**
 * Tests for lib/repo-map/queries
 */

'use strict';

const queries = require('../lib/repo-map/queries');

describe('repo-map queries', () => {
  describe('getQueriesForLanguage', () => {
    test('returns JavaScript patterns for javascript', () => {
      const result = queries.getQueriesForLanguage('javascript');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
      expect(result.functions).toBeInstanceOf(Array);
      expect(result.classes).toBeInstanceOf(Array);
      expect(result.imports).toBeInstanceOf(Array);
    });

    test('returns JavaScript patterns for js alias', () => {
      const result = queries.getQueriesForLanguage('js');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
    });

    test('returns JavaScript patterns for node alias', () => {
      const result = queries.getQueriesForLanguage('node');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
    });

    test('returns TypeScript patterns for typescript', () => {
      const result = queries.getQueriesForLanguage('typescript');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
      expect(result.types).toBeInstanceOf(Array);
      expect(result.types.length).toBeGreaterThan(0);
    });

    test('returns TypeScript patterns for ts alias', () => {
      const result = queries.getQueriesForLanguage('ts');
      expect(result).toBeTruthy();
      expect(result.types).toBeInstanceOf(Array);
    });

    test('returns Python patterns for python', () => {
      const result = queries.getQueriesForLanguage('python');
      expect(result).toBeTruthy();
      expect(result.functions).toBeInstanceOf(Array);
      expect(result.classes).toBeInstanceOf(Array);
    });

    test('returns Python patterns for py alias', () => {
      const result = queries.getQueriesForLanguage('py');
      expect(result).toBeTruthy();
      expect(result.functions).toBeInstanceOf(Array);
    });

    test('returns Rust patterns for rust', () => {
      const result = queries.getQueriesForLanguage('rust');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
      expect(result.functions).toBeInstanceOf(Array);
      expect(result.types).toBeInstanceOf(Array);
    });

    test('returns Go patterns for go', () => {
      const result = queries.getQueriesForLanguage('go');
      expect(result).toBeTruthy();
      expect(result.functions).toBeInstanceOf(Array);
      expect(result.types).toBeInstanceOf(Array);
    });

    test('returns Java patterns for java', () => {
      const result = queries.getQueriesForLanguage('java');
      expect(result).toBeTruthy();
      expect(result.exports).toBeInstanceOf(Array);
      expect(result.classes).toBeInstanceOf(Array);
    });

    test('returns null for unknown language', () => {
      const result = queries.getQueriesForLanguage('unknown');
      expect(result).toBeNull();
    });

    test('returns null for empty string', () => {
      const result = queries.getQueriesForLanguage('');
      expect(result).toBeNull();
    });
  });

  describe('getSgLanguage', () => {
    test('returns javascript for js-based aliases', () => {
      expect(queries.getSgLanguage('javascript')).toBe('javascript');
      expect(queries.getSgLanguage('js')).toBe('javascript');
      expect(queries.getSgLanguage('node')).toBe('javascript');
    });

    test('returns typescript for ts-based aliases', () => {
      expect(queries.getSgLanguage('typescript')).toBe('typescript');
      expect(queries.getSgLanguage('ts')).toBe('typescript');
    });

    test('returns python for py-based aliases', () => {
      expect(queries.getSgLanguage('python')).toBe('python');
      expect(queries.getSgLanguage('py')).toBe('python');
    });

    test('returns rust for rust', () => {
      expect(queries.getSgLanguage('rust')).toBe('rust');
    });

    test('returns go for go', () => {
      expect(queries.getSgLanguage('go')).toBe('go');
    });

    test('returns java for java', () => {
      expect(queries.getSgLanguage('java')).toBe('java');
    });

    test('returns javascript as default for unknown', () => {
      expect(queries.getSgLanguage('unknown')).toBe('javascript');
    });
  });

  describe('getSgLanguageForFile', () => {
    test('returns jsx for .jsx files in javascript', () => {
      expect(queries.getSgLanguageForFile('component.jsx', 'javascript')).toBe('jsx');
    });

    test('returns javascript for .js files in javascript', () => {
      expect(queries.getSgLanguageForFile('index.js', 'javascript')).toBe('javascript');
    });

    test('returns tsx for .tsx files in typescript', () => {
      expect(queries.getSgLanguageForFile('Component.tsx', 'typescript')).toBe('tsx');
    });

    test('returns typescript for .ts files in typescript', () => {
      expect(queries.getSgLanguageForFile('index.ts', 'typescript')).toBe('typescript');
    });

    test('returns base language for other languages', () => {
      expect(queries.getSgLanguageForFile('main.py', 'python')).toBe('python');
      expect(queries.getSgLanguageForFile('main.rs', 'rust')).toBe('rust');
      expect(queries.getSgLanguageForFile('main.go', 'go')).toBe('go');
      expect(queries.getSgLanguageForFile('Main.java', 'java')).toBe('java');
    });

    test('handles paths with directories', () => {
      expect(queries.getSgLanguageForFile('src/components/Button.jsx', 'javascript')).toBe('jsx');
      expect(queries.getSgLanguageForFile('lib/utils/helper.tsx', 'typescript')).toBe('tsx');
    });

    test('handles uppercase extensions', () => {
      expect(queries.getSgLanguageForFile('Component.JSX', 'javascript')).toBe('jsx');
      expect(queries.getSgLanguageForFile('Component.TSX', 'typescript')).toBe('tsx');
    });
  });

  describe('query pattern structure validation', () => {
    const languages = ['javascript', 'typescript', 'python', 'rust', 'go', 'java'];

    languages.forEach(lang => {
      describe(`${lang} patterns`, () => {
        let patterns;

        beforeAll(() => {
          patterns = queries.getQueriesForLanguage(lang);
        });

        test('has required categories', () => {
          expect(patterns).toHaveProperty('exports');
          expect(patterns).toHaveProperty('functions');
          expect(patterns).toHaveProperty('classes');
          expect(patterns).toHaveProperty('types');
          expect(patterns).toHaveProperty('constants');
          expect(patterns).toHaveProperty('imports');
        });

        test('all categories are arrays', () => {
          expect(patterns.exports).toBeInstanceOf(Array);
          expect(patterns.functions).toBeInstanceOf(Array);
          expect(patterns.classes).toBeInstanceOf(Array);
          expect(patterns.types).toBeInstanceOf(Array);
          expect(patterns.constants).toBeInstanceOf(Array);
          expect(patterns.imports).toBeInstanceOf(Array);
        });

        test('export patterns have required fields', () => {
          patterns.exports.forEach(pattern => {
            expect(pattern).toHaveProperty('pattern');
            expect(typeof pattern.pattern).toBe('string');
            expect(pattern).toHaveProperty('kind');
          });
        });

        test('function patterns have required fields', () => {
          patterns.functions.forEach(pattern => {
            expect(pattern).toHaveProperty('pattern');
            expect(typeof pattern.pattern).toBe('string');
          });
        });

        test('class patterns have required fields', () => {
          patterns.classes.forEach(pattern => {
            expect(pattern).toHaveProperty('pattern');
            expect(typeof pattern.pattern).toBe('string');
          });
        });

        test('import patterns have required fields', () => {
          patterns.imports.forEach(pattern => {
            expect(pattern).toHaveProperty('pattern');
            expect(typeof pattern.pattern).toBe('string');
            expect(pattern).toHaveProperty('sourceVar');
          });
        });

        test('patterns have nameVar or fallbackName for name extraction', () => {
          const allPatternsWithNames = [
            ...patterns.functions,
            ...patterns.classes,
            ...patterns.types,
            ...patterns.constants
          ];

          allPatternsWithNames.forEach(pattern => {
            const hasNameExtraction = pattern.nameVar || pattern.fallbackName || pattern.multi;
            expect(hasNameExtraction).toBeTruthy();
          });
        });
      });
    });
  });

  describe('TypeScript extends JavaScript', () => {
    test('TypeScript exports include JavaScript exports', () => {
      const ts = queries.getQueriesForLanguage('typescript');
      const js = queries.getQueriesForLanguage('javascript');

      // TypeScript should have all JavaScript export patterns plus TypeScript-specific ones
      expect(ts.exports.length).toBeGreaterThan(js.exports.length);

      // Check that TypeScript has TypeScript-specific patterns
      const tsOnlyPatterns = ts.exports.filter(p => p.pattern.includes('interface') || p.pattern.includes('type '));
      expect(tsOnlyPatterns.length).toBeGreaterThan(0);
    });

    test('TypeScript imports include JavaScript imports', () => {
      const ts = queries.getQueriesForLanguage('typescript');
      const js = queries.getQueriesForLanguage('javascript');

      // TypeScript should have type imports in addition to JavaScript imports
      expect(ts.imports.length).toBeGreaterThan(js.imports.length);

      // Check for type import patterns
      const typeImports = ts.imports.filter(p => p.pattern.includes('import type'));
      expect(typeImports.length).toBeGreaterThan(0);
    });

    test('TypeScript types array has content while JavaScript types is empty', () => {
      const ts = queries.getQueriesForLanguage('typescript');
      const js = queries.getQueriesForLanguage('javascript');

      expect(js.types).toEqual([]);
      expect(ts.types.length).toBeGreaterThan(0);
    });
  });

  describe('language-specific patterns', () => {
    test('JavaScript has CommonJS patterns', () => {
      const js = queries.getQueriesForLanguage('javascript');
      const moduleExports = js.exports.filter(p => p.pattern.includes('module.exports'));
      const requireImports = js.imports.filter(p => p.pattern.includes('require'));

      expect(moduleExports.length).toBeGreaterThan(0);
      expect(requireImports.length).toBeGreaterThan(0);
    });

    test('Python has async def patterns', () => {
      const py = queries.getQueriesForLanguage('python');
      const asyncFuncs = py.functions.filter(p => p.pattern.includes('async def'));

      expect(asyncFuncs.length).toBeGreaterThan(0);
    });

    test('Rust has visibility modifier patterns', () => {
      const rust = queries.getQueriesForLanguage('rust');
      const pubExports = rust.exports.filter(p => p.pattern.includes('pub'));
      const crateExports = rust.exports.filter(p => p.pattern.includes('pub(crate)'));

      expect(pubExports.length).toBeGreaterThan(0);
      expect(crateExports.length).toBeGreaterThan(0);
    });

    test('Go has method patterns with receiver', () => {
      const go = queries.getQueriesForLanguage('go');
      const methodPatterns = go.functions.filter(p => p.pattern.includes('func ($$$)'));

      expect(methodPatterns.length).toBeGreaterThan(0);
    });

    test('Java has access modifier patterns', () => {
      const java = queries.getQueriesForLanguage('java');
      const publicFuncs = java.functions.filter(p => p.pattern.includes('public'));
      const privateFuncs = java.functions.filter(p => p.pattern.includes('private'));

      expect(publicFuncs.length).toBeGreaterThan(0);
      expect(privateFuncs.length).toBeGreaterThan(0);
    });
  });
});
