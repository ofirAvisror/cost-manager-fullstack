module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'app_*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  maxWorkers: 1
};

