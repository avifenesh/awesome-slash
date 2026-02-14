/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/plugins/.*/lib/',
    '/.claude/worktrees/',
    '/worktrees/'
  ],
  modulePathIgnorePatterns: [
    '/.claude/worktrees/',
    '/worktrees/'
  ],
  collectCoverageFrom: [
    'bin/**/*.js',
    'scripts/**/*.js',
    'adapters/**/*.js',
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!adapters/**/README.md'
  ],
  moduleNameMapper: {
    '^@agentsys/lib$': '<rootDir>/lib/index.js',
    '^@agentsys/lib/(.*)$': '<rootDir>/lib/$1'
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  verbose: true,
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true,
  // Run tests sequentially - parallel workers cause race conditions on shared
  // filesystem state (discovery cache, adapter generation, preflight validators)
  maxWorkers: 1
};
