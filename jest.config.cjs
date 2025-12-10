/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm', // ESM preset 사용
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // CJS 모듈이 문제될 경우 강제 경로 지정
    'passport-local': '<rootDir>/node_modules/passport-local/index.js',
    'passport-jwt': '<rootDir>/node_modules/passport-jwt/dist/index.js',
  },
};
