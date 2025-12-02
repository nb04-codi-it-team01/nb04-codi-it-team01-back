/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // ESM 쓰는 경우
  // extensionsToTreatAsEsm: ['.ts'],
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   },
  // },
};
