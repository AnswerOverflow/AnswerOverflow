import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  // [...]
  // Replace `ts-jest` with the preset you want to use
  // from the above list
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "~test/(.*)": "<rootDir>/test/$1",
    "~utils/(.*)": "<rootDir>/src/utils/$1",
    "~listeners/(.*)": "<rootDir>/src/listeners/$1",
    "~primitives/(.*)": "<rootDir>/src/primitives/$1",
    "~interaction-handlers/(.*)": "<rootDir>/src/interaction-handlers/$1",
    "~components/(.*)": "<rootDir>/src/components/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};

export default jestConfig;
