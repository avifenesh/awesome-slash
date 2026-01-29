const profilingRunner = require('../lib/perf/profiling-runner');
const profilers = require('../lib/perf/profilers');

describe('perf profiling runner', () => {
  it('runs selected profiler command', () => {
    const originalSelect = profilers.selectProfiler;
    profilers.selectProfiler = () => ({
      id: 'fake',
      buildCommand: () => 'node -e "console.log(\'ok\')"',
      parseOutput: () => ({ tool: 'fake', hotspots: ['file:1'], artifacts: ['out.prof'] })
    });

    const result = profilingRunner.runProfiling();
    profilers.selectProfiler = originalSelect;

    expect(result.ok).toBe(true);
    expect(result.result.tool).toBe('fake');
    expect(result.result.artifacts[0]).toBe('out.prof');
  });
});
