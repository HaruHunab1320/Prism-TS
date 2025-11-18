module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@prism-lang/core$': '<rootDir>/../../packages/prism-core/src',
    '^@prism-lang/core/(.*)$': '<rootDir>/../../packages/prism-core/src/$1',
    '^@prism-lang/llm$': '<rootDir>/../../packages/prism-llm/src',
    '^@prism-lang/llm/(.*)$': '<rootDir>/../../packages/prism-llm/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
