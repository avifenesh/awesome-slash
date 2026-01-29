/**
 * Constraint testing runner for /perf.
 *
 * @module lib/perf/constraint-runner
 */

const { runBenchmark, parseMetrics, DEFAULT_MIN_DURATION } = require('./benchmark-runner');
const { compareBaselines } = require('./baseline-comparator');

/**
 * Run baseline and constrained benchmarks sequentially.
 * Constraints are provided via env vars to keep it cross-platform.
 *
 * @param {object} options
 * @param {string} options.command
 * @param {object} options.constraints
 * @param {object} [options.env]
 * @returns {{ constraints: object, baseline: object, constrained: object, delta: object }}
 */
function runConstraintTest(options) {
  const { command, constraints, env } = options || {};

  if (!command || typeof command !== 'string') {
    throw new Error('command must be a non-empty string');
  }
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    throw new Error('constraints must be an object');
  }

  const baselineResult = runBenchmark(command, {
    duration: DEFAULT_MIN_DURATION,
    env: {
      ...env
    }
  });
  const baselineMetrics = parseMetrics(baselineResult.output);
  if (!baselineMetrics.ok) {
    throw new Error(`Baseline metrics parse failed: ${baselineMetrics.error}`);
  }

  const constrainedResult = runBenchmark(command, {
    duration: DEFAULT_MIN_DURATION,
    env: {
      ...env,
      PERF_CPU_LIMIT: constraints.cpu,
      PERF_MEMORY_LIMIT: constraints.memory
    }
  });
  const constrainedMetrics = parseMetrics(constrainedResult.output);
  if (!constrainedMetrics.ok) {
    throw new Error(`Constrained metrics parse failed: ${constrainedMetrics.error}`);
  }

  const delta = compareBaselines(
    { metrics: baselineMetrics.metrics },
    { metrics: constrainedMetrics.metrics }
  );

  return {
    constraints,
    baseline: { metrics: baselineMetrics.metrics },
    constrained: { metrics: constrainedMetrics.metrics },
    delta
  };
}

module.exports = {
  runConstraintTest
};
