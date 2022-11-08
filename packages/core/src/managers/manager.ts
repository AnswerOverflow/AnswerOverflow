import { AnswerOverflowClient } from "../answer-overflow-client";

export abstract class Manager {
  // eslint-disable-next-line no-unused-vars
  constructor(protected answer_overflow_client: AnswerOverflowClient) {}
}
