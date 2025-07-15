module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  moduleNameMapper: {
    '^@prism/core$': '<rootDir>/../prism-core/src',
    '^@prism/core/(.*)$': '<rootDir>/../prism-core/src/$1',
    '^@prism/llm$': '<rootDir>/../prism-llm/src',
    '^@prism/llm/(.*)$': '<rootDir>/../prism-llm/src/$1'
  }
};