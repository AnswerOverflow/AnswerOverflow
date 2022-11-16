import { AnswerOverflowClient } from "../answer-overflow-client";
import { ExtendedBase } from "../structures/base";

declare type EBase = ExtendedBase<{}, any>;

export interface Command<T extends EBase> {
  execute(): Promise<T | null>;
}

export interface Cacheable {
  getCacheId(): string;
}

export abstract class ClientCommand<T extends EBase> implements Command<T> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly answer_overflow_client: AnswerOverflowClient
  ) {}
  public abstract execute(): Promise<T | null>;
}

export abstract class CreateCommand<T extends EBase, CreateInput> extends ClientCommand<T> {
  constructor(
    answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly args: CreateInput
  ) {
    super(answer_overflow_client);
  }
  public abstract execute(): Promise<T>;
}

export abstract class UpdateCommand<T extends EBase> extends ClientCommand<T> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly caller: T,
    // eslint-disable-next-line no-unused-vars
    public readonly new_data: Parameters<T["update"]>[0]
  ) {
    super(answer_overflow_client);
  }
  public abstract execute(): Promise<T>;
}

export abstract class GetCommand<T extends EBase, GetInput>
  extends ClientCommand<T>
  implements Cacheable
{
  public abstract getCacheId(): string;
  constructor(
    // eslint-disable-next-line no-unused-vars
    answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly where: GetInput
  ) {
    super(answer_overflow_client);
  }
}

export abstract class Manager<T extends EBase, GetInput, CreateInput> {
  public readonly cache = new Map<string, T>();
  // eslint-disable-next-line no-unused-vars
  constructor(public answer_overflow_client: AnswerOverflowClient) {}

  public updateCache(data: T): T {
    const existing = this.cache.get(data.getCacheId());
    if (existing) {
      existing.updateCacheEntry(data.data);
      return existing;
    }
    this.cache.set(data.getCacheId(), data);
    return data;
  }

  // eslint-disable-next-line no-unused-vars
  public abstract get(where: GetInput): Promise<T | null>;

  // eslint-disable-next-line no-unused-vars
  protected async _get(command: GetCommand<T, GetInput>): Promise<T | null> {
    const cached = this.cache.get(command.getCacheId());
    if (cached) {
      return cached;
    }
    const results = await command.execute();
    if (!results) {
      return null;
    }
    return this.updateCache(results);
  }

  // eslint-disable-next-line no-unused-vars
  public abstract create(args: CreateInput): Promise<T>;

  protected async _create(update: CreateCommand<T, CreateInput>): Promise<T> {
    const created = await update.execute();
    return this.updateCache(created);
  }

  // eslint-disable-next-line no-unused-vars
  public abstract update(target: T, updated_data: Parameters<T["update"]>[0]): Promise<T>;

  protected async _update(command: UpdateCommand<T>): Promise<T> {
    const created = await command.execute();
    return this.updateCache(created);
  }
}
