module.exports = {
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],  
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
