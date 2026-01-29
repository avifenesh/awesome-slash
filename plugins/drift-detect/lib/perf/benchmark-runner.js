/**
 * Sequential benchmark runner utilities.
 *
 * @module lib/perf/benchmark-runner
 */

const { execSync } = require('child_process');
const { validateBaseline } = require('./schemas');

const DEFAULT_MIN_DURATION = 60;
const BINARY_SEARCH_MIN_DURATION = 30;

/**
 * Normalize benchmark options and enforce minimum durations.
 * @param {object} options
 * @returns {object}
 */
function normalizeBenchmarkOptions(options = {}) {
  const mode = options.mode || 'full';
  const minDuration = mode === 'binary-search'
    ? BINARY_SEARCH_MIN_DURATION
    : DEFAULT_MIN_DURATION;

  const duration = Math.max(options.duration || minDuration, minDuration);
  return {
    ...options,
    mode,
    duration,
    warmup: options.warmup || 10
  };
}

/**
 * Run a benchmark command synchronously (sequential only).
 * @param {string} command
 * @param {object} options
 * @returns {{ success: boolean, output: string }}
 */
function runBenchmark(command, options = {}) {
  if (!command || typeof command !== 'string') {
    throw new Error('Benchmark command must be a non-empty string');
  }

  const normalized = normalizeBenchmarkOptions(options);
  const env = { ...process.env, ...normalized.env };

  const output = execSync(command, {
    stdio: 'pipe',
    encoding: 'utf8',
    env
  });

  return {
    success: true,
    output,
    duration: normalized.duration,
    warmup: normalized.warmup,
    mode: normalized.mode
  };
}

/**
 * Parse metrics from benchmark output using PERF_METRICS markers.
 * @param {string} output
 * @returns {{ ok: boolean, metrics?: object, error?: string }}
 */
function parseMetrics(output) {
  if (typeof output !== 'string') {
    return { ok: false, error: 'Output must be a string' };
  }

  const startMarker = 'PERF_METRICS_START';
  const endMarker = 'PERF_METRICS_END';
  const startIndex = output.indexOf(startMarker);
  const endIndex = output.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { ok: false, error: 'Metrics markers not found' };
  }

  const jsonStart = startIndex + startMarker.length;
  const raw = output.slice(jsonStart, endIndex).trim();

  try {
    const parsed = JSON.parse(raw);
    const validation = validateBaseline({
      version: 'temp',
      recordedAt: new Date().toISOString(),
      command: 'temp',
      metrics: parsed
    });
    if (!validation.ok) {
      return { ok: false, error: `Invalid metrics: ${validation.errors.join(', ')}` };
    }
    return { ok: true, metrics: parsed };
  } catch (error) {
    return { ok: false, error: `Failed to parse metrics JSON: ${error.message}` };
  }
}

module.exports = {
  DEFAULT_MIN_DURATION,
  BINARY_SEARCH_MIN_DURATION,
  normalizeBenchmarkOptions,
  runBenchmark,
  parseMetrics
};
