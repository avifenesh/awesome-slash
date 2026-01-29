const fs = require('fs');
const os = require('os');
const path = require('path');

const profilers = require('../lib/perf/profilers');

describe('perf profiler selection', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-profilers-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('selects node profiler for package.json', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}', 'utf8');
    const profiler = profilers.selectProfiler(tempDir);
    expect(profiler.id).toBe('node');
  });

  it('selects java profiler when pom.xml exists', () => {
    fs.writeFileSync(path.join(tempDir, 'pom.xml'), '<project/>', 'utf8');
    const profiler = profilers.selectProfiler(tempDir);
    expect(profiler.id).toBe('jfr');
  });

  it('selects go profiler when go.mod exists', () => {
    fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module test', 'utf8');
    const profiler = profilers.selectProfiler(tempDir);
    expect(profiler.id).toBe('pprof');
  });

  it('selects python profiler when requirements.txt exists', () => {
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask', 'utf8');
    const profiler = profilers.selectProfiler(tempDir);
    expect(profiler.id).toBe('cprofile');
  });

  it('selects rust profiler when Cargo.toml exists', () => {
    fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]', 'utf8');
    const profiler = profilers.selectProfiler(tempDir);
    expect(profiler.id).toBe('perf');
  });
});
