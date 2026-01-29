const { normalizeKeywords, collectCodePaths } = require('../lib/perf/code-paths');

describe('perf code-paths', () => {
  it('normalizes scenario keywords', () => {
    expect(normalizeKeywords('Auth latency spikes during login')).toEqual([
      'auth',
      'latency',
      'spikes',
      'during',
      'login'
    ]);
  });

  it('collects code paths from repo map', () => {
    const map = {
      files: {
        'src/auth/login.js': {
          symbols: {
            exports: [],
            functions: [{ name: 'login' }],
            classes: [],
            types: [],
            constants: []
          }
        },
        'src/cache/index.js': {
          symbols: {
            exports: [],
            functions: [{ name: 'warmCache' }],
            classes: [],
            types: [],
            constants: []
          }
        }
      }
    };

    const result = collectCodePaths(map, 'Login latency regression', 5);
    expect(result.keywords).toContain('login');
    expect(result.paths.length).toBe(1);
    expect(result.paths[0].file).toBe('src/auth/login.js');
  });
});
