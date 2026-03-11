const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset({
  tsconfig: 'tsconfig.test.json',
}).transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  collectCoverage: true,
  reporters: ['default', 'jest-junit'],
};
