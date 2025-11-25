module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false
    }]
  }
};
