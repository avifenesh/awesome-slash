const { parseCommand } = require('../lib/utils/command-parser');

describe('lib/utils', () => {
  test('command parser utility is available', () => {
    const parsed = parseCommand('node --version');
    expect(parsed.executable).toBe('node');
    expect(parsed.args).toEqual(['--version']);
  });
});
