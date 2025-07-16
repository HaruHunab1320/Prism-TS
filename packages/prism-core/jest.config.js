module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  moduleNameMapper: {
    '^@prism-lang/llm$': '<rootDir>/../prism-llm/src',
    '^@prism-lang/llm/(.*)$': '<rootDir>/../prism-llm/src/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  forceExit: true,
  testTimeout: 10000,
};