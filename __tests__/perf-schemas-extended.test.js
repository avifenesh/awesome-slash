/**
 * Extended tests for lib/perf/schemas.js
 * Covers: assertValid, edge cases, scenario validation
 */
const { validateBaseline, validateInvestigationState, assertValid } = require('../lib/perf/schemas');

describe('perf schemas extended', () => {
  describe('assertValid', () => {
    it('does not throw for valid result', () => {
      expect(() => {
        assertValid({ ok: true, errors: [] }, 'Test message');
      }).not.toThrow();
    });

    it('throws with message and errors for invalid result', () => {
      expect(() => {
        assertValid({ ok: false, errors: ['error1', 'error2'] }, 'Validation failed');
      }).toThrow('Validation failed: error1, error2');
    });
  });

  describe('validateInvestigationState', () => {
    it('rejects non-object input', () => {
      expect(validateInvestigationState(null).ok).toBe(false);
      expect(validateInvestigationState('string').ok).toBe(false);
      expect(validateInvestigationState(123).ok).toBe(false);
      expect(validateInvestigationState([]).ok).toBe(false);
    });

    it('validates all required fields', () => {
      const result = validateInvestigationState({});
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('missing schemaVersion');
      expect(result.errors).toContain('missing id');
      expect(result.errors).toContain('missing status');
      expect(result.errors).toContain('missing phase');
      expect(result.errors).toContain('missing scenario');
    });

    it('validates id is non-empty string', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: '   ',
        status: 'in_progress',
        phase: 'setup',
        scenario: { description: '', metrics: [], successCriteria: '' }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('id must be a non-empty string');
    });

    it('validates phase is non-empty string', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'test-id',
        status: 'in_progress',
        phase: '',
        scenario: { description: '', metrics: [], successCriteria: '' }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('phase must be a non-empty string');
    });

    it('validates scenario object structure', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'test-id',
        status: 'in_progress',
        phase: 'setup',
        scenario: {
          description: 123,
          metrics: 'not an array',
          successCriteria: null
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('scenario.description must be a string');
      expect(result.errors).toContain('scenario.metrics must be an array');
      expect(result.errors).toContain('scenario.successCriteria must be a string');
    });

    it('validates scenario.scenarios array items', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'test-id',
        status: 'in_progress',
        phase: 'setup',
        scenario: {
          description: 'test',
          metrics: [],
          successCriteria: '',
          scenarios: [
            { name: 'valid', params: {} },
            { name: '', params: {} },
            'not an object',
            { name: 'with-bad-params', params: 'string' }
          ]
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('scenario.scenarios[1].name must be a non-empty string');
      expect(result.errors).toContain('scenario.scenarios[2] must be an object');
      expect(result.errors).toContain('scenario.scenarios[3].params must be an object when provided');
    });

    it('accepts valid investigation state', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'perf-test-123',
        status: 'in_progress',
        phase: 'baseline',
        scenario: {
          description: 'API latency test',
          metrics: ['latency_ms', 'throughput'],
          successCriteria: 'latency < 100ms'
        }
      });
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts scenario.scenarios as null', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'perf-test-123',
        status: 'in_progress',
        phase: 'setup',
        scenario: {
          description: 'test',
          metrics: [],
          successCriteria: '',
          scenarios: null
        }
      });
      // scenarios: null should be ignored (treated as not provided)
      expect(result.ok).toBe(true);
    });

    it('rejects scenario.scenarios as non-array', () => {
      const result = validateInvestigationState({
        schemaVersion: 1,
        id: 'test-id',
        status: 'in_progress',
        phase: 'setup',
        scenario: {
          description: 'test',
          metrics: [],
          successCriteria: '',
          scenarios: 'not an array'
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('scenario.scenarios must be an array when provided');
    });
  });

  describe('validateBaseline', () => {
    it('rejects non-object input', () => {
      expect(validateBaseline(null).ok).toBe(false);
      expect(validateBaseline(undefined).ok).toBe(false);
      expect(validateBaseline('string').ok).toBe(false);
      expect(validateBaseline([]).ok).toBe(false);
    });

    it('validates all required fields', () => {
      const result = validateBaseline({});
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('missing version');
      expect(result.errors).toContain('missing recordedAt');
      expect(result.errors).toContain('missing metrics');
      expect(result.errors).toContain('missing command');
    });

    it('validates version is non-empty string', () => {
      const result = validateBaseline({
        version: '  ',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: { latency: 100 }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('version must be a non-empty string');
    });

    it('validates recordedAt is non-empty string', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: '',
        command: 'npm test',
        metrics: { latency: 100 }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('recordedAt must be an ISO8601 string');
    });

    it('validates command is non-empty string', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: '',
        metrics: { latency: 100 }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('command must be a non-empty string');
    });

    it('validates metrics is an object', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: 'not an object'
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('metrics must be an object');
    });

    it('validates NaN metrics', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: { latency: NaN }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('metric latency must be a number');
    });

    it('validates multi-scenario metrics for NaN', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: {
          scenarios: {
            low: { latency: NaN },
            high: { latency: 200 }
          }
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('metric low.latency must be a number');
    });

    it('validates multi-scenario metrics object structure', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: {
          scenarios: {
            low: 'not an object'
          }
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('metrics.scenarios.low must be an object');
    });

    it('rejects non-object scenarios', () => {
      const result = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: {
          scenarios: 'not an object'
        }
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain('metrics.scenarios must be an object when provided');
    });

    it('validates optional env field', () => {
      const resultInvalid = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: { latency: 100 },
        env: 'not an object'
      });
      expect(resultInvalid.ok).toBe(false);
      expect(resultInvalid.errors).toContain('env must be an object when provided');

      const resultValid = validateBaseline({
        version: 'v1.0.0',
        recordedAt: new Date().toISOString(),
        command: 'npm test',
        metrics: { latency: 100 },
        env: { NODE_ENV: 'production' }
      });
      expect(resultValid.ok).toBe(true);
    });

    it('accepts valid baseline with all fields', () => {
      const result = validateBaseline({
        version: 'v2.0.0',
        recordedAt: '2025-01-15T12:00:00Z',
        command: 'npm run benchmark',
        metrics: {
          latency_ms: 95,
          throughput_rps: 1500
        },
        env: {
          NODE_ENV: 'production',
          CONCURRENCY: '100'
        }
      });
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
