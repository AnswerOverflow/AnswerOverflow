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
    "~discord-bot/test/(.*)": "<rootDir>/test/$1",
    "~discord-bot/utils/(.*)": "<rootDir>/src/utils/$1",
    "~discord-bot/listeners/(.*)": "<rootDir>/src/listeners/$1",
    "~discord-bot/primitives/(.*)": "<rootDir>/src/primitives/$1",
    "~discord-bot/interaction-handlers/(.*)": "<rootDir>/src/interaction-handlers/$1",
    "~discord-bot/components/(.*)": "<rootDir>/src/components/$1",
    "~api/utils/(.*)": "<rootDir>/../../packages/api/src/utils/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};

export default jestConfig;
