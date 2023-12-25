module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  verbose: true,
  coverageDirectory: "<rootDir>/coverage",
  collectCoverage: true,
  detectOpenHandles: true,
  silent: false,
  testTimeout: 15000,
};
