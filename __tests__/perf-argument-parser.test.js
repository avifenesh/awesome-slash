const { parseArguments } = require('../lib/perf/argument-parser');

describe('perf argument parser', () => {
  it('handles empty input', () => {
    expect(parseArguments('')).toEqual([]);
    expect(parseArguments('   ')).toEqual([]);
    expect(parseArguments(null)).toEqual([]);
  });

  it('splits basic arguments', () => {
    expect(parseArguments('--phase baseline --version v1')).toEqual([
      '--phase',
      'baseline',
      '--version',
      'v1'
    ]);
  });

  it('preserves quoted values', () => {
    const raw = '--command \"npm run bench -- --scenario small\" --quote \"latency spikes\"';
    expect(parseArguments(raw)).toEqual([
      '--command',
      'npm run bench -- --scenario small',
      '--quote',
      'latency spikes'
    ]);
  });

  it('supports single quotes', () => {
    const raw = "--quote 'cache miss surge' --phase profiling";
    expect(parseArguments(raw)).toEqual([
      '--quote',
      'cache miss surge',
      '--phase',
      'profiling'
    ]);
  });
});
