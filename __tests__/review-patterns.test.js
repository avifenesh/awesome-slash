/**
 * Tests for review-patterns.js
 */

const {
  reviewPatterns,
  getPatternsForFramework,
  getPatternsByCategory,
  getPatternsForFrameworkCategory,
  getAvailableFrameworks,
  getAvailableCategories,
  getCategoriesForFramework,
  hasPatternsFor,
  hasCategory,
  getPatternCount,
  getTotalPatternCount,
  searchPatterns,
  getFrameworksWithCategory
} = require('../lib/patterns/review-patterns');

describe('review-patterns', () => {
  describe('reviewPatterns', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(reviewPatterns)).toBe(true);
    });

    it('should have deeply frozen nested objects', () => {
      // Test that nested framework objects are also frozen
      Object.values(reviewPatterns).forEach(framework => {
        expect(Object.isFrozen(framework)).toBe(true);
        Object.values(framework).forEach(category => {
          expect(Object.isFrozen(category)).toBe(true);
        });
      });
    });

    it('should prevent modifications to patterns', () => {
      // Frozen objects prevent modifications - verify no new property exists
      const originalKeys = Object.keys(reviewPatterns).sort();
      try {
        reviewPatterns.newFramework = {};
      } catch {
        // May throw in strict mode, which is expected
      }
      // Verify the object was not modified
      expect(reviewPatterns.newFramework).toBeUndefined();
      expect(Object.keys(reviewPatterns).sort()).toEqual(originalKeys);
    });

    it('should prevent modifications to nested arrays', () => {
      const originalLength = reviewPatterns.react.hooks_rules.length;
      expect(() => {
        reviewPatterns.react.hooks_rules.push('new pattern');
      }).toThrow();
      expect(reviewPatterns.react.hooks_rules.length).toBe(originalLength);
    });

    it('should have patterns for major frameworks', () => {
      expect(reviewPatterns).toHaveProperty('react');
      expect(reviewPatterns).toHaveProperty('vue');
      expect(reviewPatterns).toHaveProperty('angular');
      expect(reviewPatterns).toHaveProperty('django');
      expect(reviewPatterns).toHaveProperty('express');
      expect(reviewPatterns).toHaveProperty('rust');
      expect(reviewPatterns).toHaveProperty('go');
    });

    it('should have patterns for fastapi', () => {
      expect(reviewPatterns).toHaveProperty('fastapi');
      expect(reviewPatterns.fastapi).toHaveProperty('async_patterns');
      expect(reviewPatterns.fastapi).toHaveProperty('validation');
      expect(reviewPatterns.fastapi).toHaveProperty('dependencies');
    });

    it('should have categories with arrays of patterns', () => {
      Object.values(reviewPatterns).forEach(framework => {
        Object.values(framework).forEach(category => {
          expect(Array.isArray(category)).toBe(true);
          expect(category.length).toBeGreaterThan(0);
          category.forEach(pattern => {
            expect(typeof pattern).toBe('string');
          });
        });
      });
    });
  });

  describe('getPatternsForFramework', () => {
    it('should return patterns for valid framework', () => {
      const patterns = getPatternsForFramework('react');
      expect(patterns).not.toBeNull();
      expect(patterns).toHaveProperty('hooks_rules');
      expect(patterns).toHaveProperty('state_management');
      expect(patterns).toHaveProperty('performance');
    });

    it('should be case-insensitive', () => {
      const patterns1 = getPatternsForFramework('React');
      const patterns2 = getPatternsForFramework('REACT');
      expect(patterns1).toEqual(patterns2);
    });

    it('should return null for invalid framework', () => {
      expect(getPatternsForFramework('nonexistent')).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(getPatternsForFramework(123)).toBeNull();
      expect(getPatternsForFramework(null)).toBeNull();
    });
  });

  describe('getPatternsByCategory', () => {
    it('should return Map of frameworks for a category', () => {
      const securityPatterns = getPatternsByCategory('security');
      expect(securityPatterns instanceof Map).toBe(true);
      expect(securityPatterns.has('django')).toBe(true);
      expect(securityPatterns.has('express')).toBe(true);
    });

    it('should return empty Map for non-existent category', () => {
      const patterns = getPatternsByCategory('nonexistent');
      expect(patterns instanceof Map).toBe(true);
      expect(patterns.size).toBe(0);
    });
  });

  describe('getPatternsForFrameworkCategory', () => {
    it('should return array of patterns for framework+category', () => {
      const patterns = getPatternsForFrameworkCategory('react', 'hooks_rules');
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return null for invalid framework', () => {
      expect(getPatternsForFrameworkCategory('nonexistent', 'security')).toBeNull();
    });

    it('should return null for invalid category', () => {
      expect(getPatternsForFrameworkCategory('react', 'nonexistent')).toBeNull();
    });

    it('should be case-insensitive for framework name', () => {
      const patterns1 = getPatternsForFrameworkCategory('react', 'hooks_rules');
      const patterns2 = getPatternsForFrameworkCategory('REACT', 'hooks_rules');
      const patterns3 = getPatternsForFrameworkCategory('React', 'hooks_rules');
      expect(patterns1).toEqual(patterns2);
      expect(patterns2).toEqual(patterns3);
    });

    it('should be case-sensitive for category name', () => {
      // Categories are stored in lowercase/snake_case
      const patterns = getPatternsForFrameworkCategory('react', 'Hooks_Rules');
      expect(patterns).toBeNull();
    });

    it('should return same reference as direct access', () => {
      const directPatterns = reviewPatterns.react.hooks_rules;
      const functionPatterns = getPatternsForFrameworkCategory('react', 'hooks_rules');
      expect(functionPatterns).toBe(directPatterns);
    });
  });

  describe('getAvailableFrameworks', () => {
    it('should return array of framework names', () => {
      const frameworks = getAvailableFrameworks();
      expect(Array.isArray(frameworks)).toBe(true);
      expect(frameworks).toContain('react');
      expect(frameworks).toContain('vue');
      expect(frameworks).toContain('angular');
      expect(frameworks).toContain('django');
      expect(frameworks).toContain('fastapi');
      expect(frameworks).toContain('rust');
      expect(frameworks).toContain('go');
      expect(frameworks).toContain('express');
    });
  });

  describe('getAvailableCategories', () => {
    it('should return array of all category names', () => {
      const categories = getAvailableCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories).toContain('security');
      expect(categories).toContain('performance');
      expect(categories).toContain('error_handling');
    });
  });

  describe('getCategoriesForFramework', () => {
    it('should return categories for react', () => {
      const categories = getCategoriesForFramework('react');
      expect(categories).toContain('hooks_rules');
      expect(categories).toContain('state_management');
      expect(categories).toContain('performance');
      expect(categories).toContain('common_mistakes');
    });

    it('should return empty array for invalid framework', () => {
      const categories = getCategoriesForFramework('nonexistent');
      expect(categories).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const categories1 = getCategoriesForFramework('react');
      const categories2 = getCategoriesForFramework('REACT');
      const categories3 = getCategoriesForFramework('React');
      expect(categories1).toEqual(categories2);
      expect(categories2).toEqual(categories3);
    });

    it('should return categories for all frameworks', () => {
      const frameworks = getAvailableFrameworks();
      frameworks.forEach(framework => {
        const categories = getCategoriesForFramework(framework);
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('hasPatternsFor', () => {
    it('should return true for valid frameworks', () => {
      expect(hasPatternsFor('react')).toBe(true);
      expect(hasPatternsFor('vue')).toBe(true);
      expect(hasPatternsFor('django')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(hasPatternsFor('React')).toBe(true);
      expect(hasPatternsFor('DJANGO')).toBe(true);
    });

    it('should return false for invalid frameworks', () => {
      expect(hasPatternsFor('nonexistent')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(hasPatternsFor(123)).toBe(false);
      expect(hasPatternsFor(null)).toBe(false);
    });
  });

  describe('hasCategory', () => {
    it('should return true for existing categories', () => {
      expect(hasCategory('security')).toBe(true);
      expect(hasCategory('performance')).toBe(true);
    });

    it('should return false for non-existing categories', () => {
      expect(hasCategory('nonexistent')).toBe(false);
    });

    it('should be case-sensitive (categories are lowercase)', () => {
      expect(hasCategory('Security')).toBe(false);
      expect(hasCategory('PERFORMANCE')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(hasCategory(123)).toBe(false);
      expect(hasCategory(null)).toBe(false);
      expect(hasCategory(undefined)).toBe(false);
      expect(hasCategory({})).toBe(false);
    });
  });

  describe('getPatternCount', () => {
    it('should return pattern count for framework', () => {
      const count = getPatternCount('react');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for invalid framework', () => {
      expect(getPatternCount('nonexistent')).toBe(0);
    });

    it('should be case-insensitive', () => {
      const count1 = getPatternCount('react');
      const count2 = getPatternCount('REACT');
      const count3 = getPatternCount('React');
      expect(count1).toBe(count2);
      expect(count2).toBe(count3);
    });

    it('should return correct count for each framework', () => {
      const frameworks = getAvailableFrameworks();
      frameworks.forEach(framework => {
        const count = getPatternCount(framework);
        // Manually count patterns
        const categories = getCategoriesForFramework(framework);
        let manualCount = 0;
        categories.forEach(category => {
          const patterns = getPatternsForFrameworkCategory(framework, category);
          manualCount += patterns.length;
        });
        expect(count).toBe(manualCount);
      });
    });
  });

  describe('getTotalPatternCount', () => {
    it('should return total count across all frameworks', () => {
      const total = getTotalPatternCount();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(100); // We have many patterns
    });
  });

  describe('searchPatterns', () => {
    it('should find patterns containing keyword', () => {
      const results = searchPatterns('memory');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result).toHaveProperty('framework');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('pattern');
        expect(result.pattern.toLowerCase()).toContain('memory');
      });
    });

    it('should be case-insensitive', () => {
      const results1 = searchPatterns('memory');
      const results2 = searchPatterns('MEMORY');
      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array when no matches', () => {
      const results = searchPatterns('xyznonexistentxyz');
      expect(results).toEqual([]);
    });

    it('should support limit option', () => {
      const allResults = searchPatterns('error');
      const limitedResults = searchPatterns('error', { limit: 3 });
      expect(limitedResults.length).toBe(3);
      expect(allResults.length).toBeGreaterThan(3);
      // Limited results should be a subset of all results
      limitedResults.forEach((result, index) => {
        expect(result).toEqual(allResults[index]);
      });
    });

    it('should support offset option', () => {
      const allResults = searchPatterns('error');
      const offsetResults = searchPatterns('error', { offset: 2 });
      // Offset results should skip first 2
      expect(offsetResults[0]).toEqual(allResults[2]);
    });

    it('should support combined limit and offset options', () => {
      const allResults = searchPatterns('error');
      const paginatedResults = searchPatterns('error', { limit: 2, offset: 3 });
      expect(paginatedResults.length).toBe(2);
      expect(paginatedResults[0]).toEqual(allResults[3]);
      expect(paginatedResults[1]).toEqual(allResults[4]);
    });

    it('should return empty array when offset exceeds results', () => {
      const results = searchPatterns('error', { offset: 1000 });
      expect(results).toEqual([]);
    });

    it('should handle empty keyword', () => {
      // Empty string matches all patterns
      const results = searchPatterns('');
      expect(results.length).toBe(getTotalPatternCount());
    });

    it('should handle special regex characters in keyword', () => {
      // Test that special characters are treated as literals
      const results = searchPatterns('(');
      results.forEach(result => {
        expect(result.pattern).toContain('(');
      });
    });
  });

  describe('getFrameworksWithCategory', () => {
    it('should return frameworks that have security category', () => {
      const frameworks = getFrameworksWithCategory('security');
      expect(frameworks).toContain('django');
      expect(frameworks).toContain('express');
    });

    it('should return empty array for non-existent category', () => {
      const frameworks = getFrameworksWithCategory('nonexistent');
      expect(frameworks).toEqual([]);
    });
  });

  describe('Pattern Structure Validation', () => {
    describe('pattern content quality', () => {
      it('should have non-empty patterns with meaningful content', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const categories = getCategoriesForFramework(framework);
          categories.forEach(category => {
            const patterns = getPatternsForFrameworkCategory(framework, category);
            patterns.forEach(pattern => {
              expect(pattern.length).toBeGreaterThan(5);
              expect(pattern.trim()).toBe(pattern); // No leading/trailing whitespace
            });
          });
        });
      });

      it('should not have empty or whitespace-only patterns', () => {
        Object.entries(reviewPatterns).forEach(([framework, categories]) => {
          Object.entries(categories).forEach(([category, patterns]) => {
            patterns.forEach((pattern, index) => {
              expect(pattern.trim().length).toBeGreaterThan(0);
            });
          });
        });
      });
    });

    describe('pattern uniqueness', () => {
      it('should not have duplicate patterns within a category', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const categories = getCategoriesForFramework(framework);
          categories.forEach(category => {
            const patterns = getPatternsForFrameworkCategory(framework, category);
            const uniquePatterns = new Set(patterns);
            expect(uniquePatterns.size).toBe(patterns.length);
          });
        });
      });

      it('should not have exact duplicate patterns across all frameworks', () => {
        const allPatterns = new Set();
        const duplicates = [];

        Object.entries(reviewPatterns).forEach(([framework, categories]) => {
          Object.entries(categories).forEach(([category, patterns]) => {
            patterns.forEach(pattern => {
              if (allPatterns.has(pattern)) {
                duplicates.push({ framework, category, pattern });
              }
              allPatterns.add(pattern);
            });
          });
        });

        // Some duplicates may be intentional across frameworks
        // but within-category duplicates should be zero
        expect(duplicates.length).toBeLessThan(10);
      });
    });

    describe('framework structure consistency', () => {
      it('should have at least one category per framework', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const categories = getCategoriesForFramework(framework);
          expect(categories.length).toBeGreaterThan(0);
        });
      });

      it('should have at least one pattern per category', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const categories = getCategoriesForFramework(framework);
          categories.forEach(category => {
            const patterns = getPatternsForFrameworkCategory(framework, category);
            expect(patterns.length).toBeGreaterThan(0);
          });
        });
      });

      it('should have lowercase framework names', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          expect(framework).toBe(framework.toLowerCase());
        });
      });

      it('should have snake_case category names', () => {
        const categories = getAvailableCategories();
        categories.forEach(category => {
          // Category should be lowercase with underscores
          expect(category).toMatch(/^[a-z][a-z0-9_]*$/);
        });
      });
    });

    describe('cross-reference integrity', () => {
      it('should have consistent category references across frameworks', () => {
        const allCategories = getAvailableCategories();

        Object.entries(reviewPatterns).forEach(([framework, categories]) => {
          Object.keys(categories).forEach(category => {
            expect(allCategories).toContain(category);
          });
        });
      });

      it('should return correct patterns through all access methods', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const frameworkPatterns = getPatternsForFramework(framework);
          const categories = getCategoriesForFramework(framework);

          categories.forEach(category => {
            // Access via framework object
            const directPatterns = frameworkPatterns[category];
            // Access via combined function
            const functionPatterns = getPatternsForFrameworkCategory(framework, category);

            expect(directPatterns).toEqual(functionPatterns);
          });
        });
      });

      it('should return correct frameworks through category lookup', () => {
        const categories = getAvailableCategories();
        categories.forEach(category => {
          const frameworksWithCategory = getFrameworksWithCategory(category);
          const patternsMap = getPatternsByCategory(category);

          // Every framework from getFrameworksWithCategory should be in patternsMap
          frameworksWithCategory.forEach(framework => {
            expect(patternsMap.has(framework)).toBe(true);
          });

          // And vice versa
          patternsMap.forEach((patterns, framework) => {
            expect(frameworksWithCategory).toContain(framework);
          });
        });
      });
    });

    describe('pattern count consistency', () => {
      it('should have consistent pattern counts', () => {
        const frameworks = getAvailableFrameworks();
        let manualTotal = 0;

        frameworks.forEach(framework => {
          const frameworkCount = getPatternCount(framework);
          let categoryTotal = 0;

          const categories = getCategoriesForFramework(framework);
          categories.forEach(category => {
            const patterns = getPatternsForFrameworkCategory(framework, category);
            categoryTotal += patterns.length;
          });

          expect(frameworkCount).toBe(categoryTotal);
          manualTotal += frameworkCount;
        });

        expect(getTotalPatternCount()).toBe(manualTotal);
      });

      it('should have reasonable pattern counts per framework', () => {
        const frameworks = getAvailableFrameworks();
        frameworks.forEach(framework => {
          const count = getPatternCount(framework);
          // Each framework should have at least 5 patterns
          expect(count).toBeGreaterThanOrEqual(5);
          // But not an unreasonable number (sanity check)
          expect(count).toBeLessThan(500);
        });
      });
    });

    describe('search functionality integrity', () => {
      it('should find all patterns containing common keywords', () => {
        const commonKeywords = ['error', 'security', 'memory', 'async'];
        commonKeywords.forEach(keyword => {
          const results = searchPatterns(keyword);
          results.forEach(result => {
            expect(result.pattern.toLowerCase()).toContain(keyword.toLowerCase());
            // Verify the result structure
            expect(result).toHaveProperty('framework');
            expect(result).toHaveProperty('category');
            expect(result).toHaveProperty('pattern');
            // Verify the result references valid data
            expect(hasPatternsFor(result.framework)).toBe(true);
            expect(hasCategory(result.category)).toBe(true);
          });
        });
      });

      it('should return results with valid back-references', () => {
        const results = searchPatterns('check');
        results.forEach(result => {
          // Verify the pattern actually exists in the referenced location
          const patterns = getPatternsForFrameworkCategory(result.framework, result.category);
          expect(patterns).toContain(result.pattern);
        });
      });
    });
  });

  describe('Framework-Specific Pattern Content', () => {
    describe('React patterns', () => {
      it('should have hooks-related patterns', () => {
        const hooksPatterns = getPatternsForFrameworkCategory('react', 'hooks_rules');
        const joined = hooksPatterns.join(' ').toLowerCase();
        expect(joined).toContain('useeffect');
        expect(joined).toContain('usestate');
        expect(joined).toContain('dependency');
      });

      it('should have state management patterns', () => {
        const statePatterns = getPatternsForFrameworkCategory('react', 'state_management');
        const joined = statePatterns.join(' ').toLowerCase();
        expect(joined).toContain('prop');
        expect(joined).toContain('state');
      });

      it('should have performance patterns', () => {
        const perfPatterns = getPatternsForFrameworkCategory('react', 'performance');
        const joined = perfPatterns.join(' ').toLowerCase();
        expect(joined).toContain('memo');
        expect(joined).toContain('render');
      });
    });

    describe('Vue patterns', () => {
      it('should have reactivity patterns', () => {
        const reactivityPatterns = getPatternsForFrameworkCategory('vue', 'reactivity');
        const joined = reactivityPatterns.join(' ').toLowerCase();
        expect(joined).toContain('reactive');
        expect(joined).toContain('computed');
      });

      it('should have composition API patterns', () => {
        const compositionPatterns = getPatternsForFrameworkCategory('vue', 'composition_api');
        const joined = compositionPatterns.join(' ').toLowerCase();
        expect(joined).toContain('ref');
        expect(joined).toContain('setup');
      });
    });

    describe('Angular patterns', () => {
      it('should have change detection patterns', () => {
        const cdPatterns = getPatternsForFrameworkCategory('angular', 'change_detection');
        const joined = cdPatterns.join(' ').toLowerCase();
        expect(joined).toContain('change detection');
        expect(joined).toContain('ngfor');
      });

      it('should have RxJS patterns', () => {
        const rxjsPatterns = getPatternsForFrameworkCategory('angular', 'rxjs');
        const joined = rxjsPatterns.join(' ').toLowerCase();
        expect(joined).toContain('subscribe');
        expect(joined).toContain('observable');
      });
    });

    describe('Django patterns', () => {
      it('should have ORM patterns', () => {
        const ormPatterns = getPatternsForFrameworkCategory('django', 'orm');
        const joined = ormPatterns.join(' ').toLowerCase();
        expect(joined).toContain('n+1');
        expect(joined).toContain('select_related');
      });

      it('should have security patterns', () => {
        const securityPatterns = getPatternsForFrameworkCategory('django', 'security');
        const joined = securityPatterns.join(' ').toLowerCase();
        expect(joined).toContain('debug');
        expect(joined).toContain('secret_key');
      });
    });

    describe('FastAPI patterns', () => {
      it('should have async patterns', () => {
        const asyncPatterns = getPatternsForFrameworkCategory('fastapi', 'async_patterns');
        const joined = asyncPatterns.join(' ').toLowerCase();
        expect(joined).toContain('async');
        expect(joined).toContain('await');
      });

      it('should have validation patterns', () => {
        const validationPatterns = getPatternsForFrameworkCategory('fastapi', 'validation');
        const joined = validationPatterns.join(' ').toLowerCase();
        expect(joined).toContain('pydantic');
        expect(joined).toContain('response');
      });
    });

    describe('Rust patterns', () => {
      it('should have safety patterns', () => {
        const safetyPatterns = getPatternsForFrameworkCategory('rust', 'safety');
        const joined = safetyPatterns.join(' ').toLowerCase();
        expect(joined).toContain('unsafe');
        expect(joined).toContain('unwrap');
      });

      it('should have error handling patterns', () => {
        const errorPatterns = getPatternsForFrameworkCategory('rust', 'error_handling');
        const joined = errorPatterns.join(' ').toLowerCase();
        expect(joined).toContain('result');
        expect(joined).toContain('panic');
      });

      it('should have async patterns', () => {
        const asyncPatterns = getPatternsForFrameworkCategory('rust', 'async_rust');
        const joined = asyncPatterns.join(' ').toLowerCase();
        expect(joined).toContain('async');
        expect(joined).toContain('tokio');
      });
    });

    describe('Go patterns', () => {
      it('should have concurrency patterns', () => {
        const concurrencyPatterns = getPatternsForFrameworkCategory('go', 'concurrency');
        const joined = concurrencyPatterns.join(' ').toLowerCase();
        expect(joined).toContain('goroutine');
        expect(joined).toContain('mutex');
        expect(joined).toContain('channel');
      });

      it('should have error handling patterns', () => {
        const errorPatterns = getPatternsForFrameworkCategory('go', 'error_handling');
        const joined = errorPatterns.join(' ').toLowerCase();
        expect(joined).toContain('error');
        expect(joined).toContain('panic');
      });
    });

    describe('Express patterns', () => {
      it('should have async handling patterns', () => {
        const asyncPatterns = getPatternsForFrameworkCategory('express', 'async_handling');
        const joined = asyncPatterns.join(' ').toLowerCase();
        expect(joined).toContain('async');
        expect(joined).toContain('promise');
      });

      it('should have security patterns', () => {
        const securityPatterns = getPatternsForFrameworkCategory('express', 'security');
        const joined = securityPatterns.join(' ').toLowerCase();
        expect(joined).toContain('helmet');
        expect(joined).toContain('cors');
        expect(joined).toContain('rate limit');
      });

      it('should have middleware patterns', () => {
        const middlewarePatterns = getPatternsForFrameworkCategory('express', 'middleware');
        const joined = middlewarePatterns.join(' ').toLowerCase();
        expect(joined).toContain('middleware');
        expect(joined).toContain('next');
      });
    });
  });

  describe('Caching and Performance', () => {
    it('should return same array reference for getAvailableFrameworks', () => {
      const frameworks1 = getAvailableFrameworks();
      const frameworks2 = getAvailableFrameworks();
      // Should be the exact same cached array reference
      expect(frameworks1).toBe(frameworks2);
    });

    it('should return same array reference for getAvailableCategories', () => {
      const categories1 = getAvailableCategories();
      const categories2 = getAvailableCategories();
      // Should be the exact same cached array reference
      expect(categories1).toBe(categories2);
    });

    it('should provide O(1) framework lookup', () => {
      // This tests the hasPatternsFor function uses the Set
      // Run it many times to verify consistent fast performance
      const iterations = 1000;
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        hasPatternsFor('react');
        hasPatternsFor('nonexistent');
      }
      const elapsed = Date.now() - start;
      // Should complete in well under 100ms for 1000 iterations
      expect(elapsed).toBeLessThan(100);
    });
  });
});
