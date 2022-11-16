import { AnswerOverflowClient } from "../answer-overflow-client";
import { ExtendedBase } from "../structures/base";

export abstract class Manager<
  T extends {},
  ET extends ExtendedBase<T, UpdateArgs>,
  CreateArgs,
  UpdateArgs
> {
  public readonly cache = new Map<string, ET>();
  // eslint-disable-next-line no-unused-vars
  constructor(protected answer_overflow_client: AnswerOverflowClient) {}

  public updateCache(data: ET): ET {
    const existing = this.cache.get(data.getCacheId());
    if (existing) {
      return existing;
    }
    this.cache.set(data.getCacheId(), data);
    return data;
  }

  // eslint-disable-next-line no-unused-vars
  public abstract get(id: string): Promise<ET | null>;
  // eslint-disable-next-line no-unused-vars
  public abstract create(data: CreateArgs): Promise<ET>;
  // eslint-disable-next-line no-unused-vars
  public abstract update(current: ET, data: UpdateArgs): Promise<ET>;
}
