/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '../',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
  ],
  setupFilesAfterSetup: ['<rootDir>/tests/jest-setup.js'],
  testTimeout: 15000,
  verbose: true,
  collectCoverage: false,
}
