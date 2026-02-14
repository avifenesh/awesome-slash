jest.mock('child_process', () => ({
  execFileSync: jest.fn()
}));

const { execFileSync } = require('child_process');
const github = require('../lib/collectors/github');

describe('collectors/github contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('scanGitHubState initializes stable shape when gh is unavailable', () => {
    execFileSync.mockImplementation(() => {
      throw new Error('gh not found');
    });

    const result = github.scanGitHubState();

    expect(result.available).toBe(false);
    expect(result.overdueMilestones).toEqual([]);
    expect(result.pagination).toBeDefined();
    expect(result.errors).toEqual([]);
  });

  test('scanGitHubState reports partial failures with structured errors', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      if (args[0] === 'issue') {
        const error = new Error('rate limited');
        error.status = 1;
        error.stderr = 'API rate limit exceeded';
        throw error;
      }
      if (args[0] === 'pr') return '[]';
      if (args[0] === 'api') return '[[]]';
      return '[]';
    });

    const result = github.scanGitHubState();

    expect(result.available).toBe(true);
    expect(result.partial).toBe(true);
    expect(result.errors.some((entry) => entry.source === 'issues')).toBe(true);
    expect(result.pagination.prs.fetchedCount).toBe(0);
    expect(result.overdueMilestones).toEqual([]);
  });
});
