import type { JestConfigWithTsJest } from "ts-jest";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
require("dotenv").config();
const jestConfig: JestConfigWithTsJest = {
  // [...]
  // Replace `ts-jest` with the preset you want to use
  // from the above list
  preset: "ts-jest",
  resetMocks: true,
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
