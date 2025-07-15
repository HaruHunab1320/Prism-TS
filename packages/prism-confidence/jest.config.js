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
    '^@prism-lang/core$': '<rootDir>/../prism-core/src',
    '^@prism-lang/core/(.*)$': '<rootDir>/../prism-core/src/$1',
    '^@prism-lang/llm$': '<rootDir>/../prism-llm/src',
    '^@prism-lang/llm/(.*)$': '<rootDir>/../prism-llm/src/$1'
  }
};