/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm', // ESM preset 사용
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // CJS 모듈이 문제될 경우 강제 경로 지정
    'passport-local': '<rootDir>/node_modules/passport-local/lib/index.js',
    'passport-jwt': '<rootDir>/node_modules/passport-jwt/lib/index.js',
    // .js 확장자를 .ts로 해석
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // 통합 테스트는 순차 실행 (데이터베이스 격리 문제 방지)
  maxWorkers: 1,
};
