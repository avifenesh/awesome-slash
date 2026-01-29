/**
 * Node.js profiler helper.
 *
 * @module lib/perf/profilers/node
 */

module.exports = {
  id: 'node',
  tool: '--cpu-prof',
  buildCommand(options = {}) {
    const command = options.command || 'node';
    const output = options.output || 'node.cpuprofile';
    return `${command} --cpu-prof --cpu-prof-name=${output}`;
  },
  parseOutput() {
    return {
      tool: 'node',
      hotspots: [],
      artifacts: []
    };
  }
};
