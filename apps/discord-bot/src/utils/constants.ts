import { join } from "path";

export const rootDir = join(__dirname, "..", "..");
export const srcDir = join(rootDir, "src");

export const LOADING_MESSAGES = [
  "Computing...",
  "Thinking...",
  "Cooking some food",
  "Give me a moment",
  "Loading...",
];

export const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";
export const ANSWER_OVERFLOW_BLUE_AS_INT = parseInt(ANSWER_OVERFLOW_BLUE_HEX.replace("#", "0x"));
