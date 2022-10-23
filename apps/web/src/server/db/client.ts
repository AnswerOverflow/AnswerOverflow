// src/server/db/client.ts
import { AnswerOverflowClient } from "@answeroverflow/core";
import { env } from "../../env/server.mjs";

declare global {
  // eslint-disable-next-line no-var
  var answer_overflow_client: AnswerOverflowClient | undefined;
}

export const answer_overflow_client =
  global.answer_overflow_client || new AnswerOverflowClient();

if (env.NODE_ENV !== "production") {
  global.answer_overflow_client = answer_overflow_client;
}
