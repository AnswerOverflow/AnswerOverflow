import { AnswerOverflowClient } from "../answer-overflow-client";
import { Base } from "../structures/base";

export abstract class Manager<T extends {}> {
  // eslint-disable-next-line no-unused-vars
  constructor(protected answer_overflow_client: AnswerOverflowClient) {}
  // eslint-disable-next-line no-unused-vars
  public abstract edit(data: T): Promise<Base<T>>;
}
