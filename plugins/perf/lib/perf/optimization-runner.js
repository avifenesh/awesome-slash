/**
 * Optimization runner for /perf experiments.
 *
 * @module lib/perf/optimization-runner
 */

const { runBenchmark, parseMetrics, DEFAULT_MIN_DURATION } = require('./benchmark-runner');
const { compareBaselines } = require('./baseline-comparator');
const { isWorkingTreeClean } = require('./checkpoint');

/**
 * Run a single optimization experiment with two benchmark runs.
 * NOTE: This helper does not modify code; it assumes the change was applied externally.
 *
 * @param {object} options
 * @param {string} options.command
 * @param {string} options.changeSummary
 * @param {object} [options.env]
 * @returns {{ baseline: object, experiment: object, delta: object, verdict: string, change: string }}
 */
function runOptimizationExperiment(options) {
  const { command, changeSummary, env } = options || {};

  if (!command || typeof command !== 'string') {
    throw new Error('command must be a non-empty string');
  }
  if (!changeSummary || typeof changeSummary !== 'string') {
    throw new Error('changeSummary must be a non-empty string');
  }

  const shouldCheckClean = options?.requireClean !== false;
  if (shouldCheckClean && !isWorkingTreeClean()) {
    throw new Error('working tree is dirty before experiment');
  }

  const baselineRun = runBenchmark(command, { duration: DEFAULT_MIN_DURATION, env });
  const baselineMetrics = parseMetrics(baselineRun.output);
  if (!baselineMetrics.ok) {
    throw new Error(`Baseline parse failed: ${baselineMetrics.error}`);
  }

  // NOTE: Caller is responsible for applying the experiment change here.
  // Warm up the system (caches/JIT) before capturing experiment metrics.
  runBenchmark(command, { duration: DEFAULT_MIN_DURATION, env });
  const experimentRun = runBenchmark(command, { duration: DEFAULT_MIN_DURATION, env });
  const experimentMetrics = parseMetrics(experimentRun.output);
  if (!experimentMetrics.ok) {
    throw new Error(`Experiment parse failed: ${experimentMetrics.error}`);
  }

  const delta = compareBaselines(
    { metrics: baselineMetrics.metrics },
    { metrics: experimentMetrics.metrics }
  );

  return {
    change: changeSummary,
    baseline: { metrics: baselineMetrics.metrics },
    experiment: { metrics: experimentMetrics.metrics },
    delta,
    verdict: 'inconclusive'
  };
}

module.exports = {
  runOptimizationExperiment
};
