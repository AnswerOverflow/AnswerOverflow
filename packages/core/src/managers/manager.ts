import { AnswerOverflowClient } from "../answer-overflow-client";
import { ExtendedBase } from "../structures/base";

export abstract class Manager<T extends {}, ET extends ExtendedBase<T>> {
  public readonly cache = new Map<string, ET>();
  // eslint-disable-next-line no-unused-vars
  constructor(protected answer_overflow_client: AnswerOverflowClient) {}
  // eslint-disable-next-line no-unused-vars
  public abstract edit(data: T): Promise<ET>;

  public updateCache(data: ET): ET {
    const existing = this.cache.get(data.getCacheId());
    if (existing) {
      return existing;
    }
    this.cache.set(data.getCacheId(), data);
    return data;
  }
}
