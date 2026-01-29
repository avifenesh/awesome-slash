const { validateBaseline, validateInvestigationState } = require('../lib/perf/schemas');

describe('perf schemas', () => {
  it('flags invalid baseline metrics', () => {
    const result = validateBaseline({
      version: 'v1.0.0',
      recordedAt: new Date().toISOString(),
      command: 'npm run bench',
      metrics: { latency: 'slow' }
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('metric latency');
  });

  it('accepts minimal valid baseline', () => {
    const result = validateBaseline({
      version: 'v1.0.0',
      recordedAt: new Date().toISOString(),
      command: 'npm run bench',
      metrics: { latency: 120 }
    });
    expect(result.ok).toBe(true);
  });

  it('accepts multi-scenario baseline metrics', () => {
    const result = validateBaseline({
      version: 'v1.0.0',
      recordedAt: new Date().toISOString(),
      command: 'npm run bench',
      metrics: {
        scenarios: {
          low: { latency_ms: 120 },
          high: { latency_ms: 450 }
        }
      }
    });
    expect(result.ok).toBe(true);
  });

  it('flags invalid investigation state', () => {
    const result = validateInvestigationState({
      schemaVersion: 1,
      id: '',
      status: 'in_progress',
      phase: '',
      scenario: {}
    });
    expect(result.ok).toBe(false);
  });
});
