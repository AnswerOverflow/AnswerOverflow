import { AnswerOverflowClient } from "../answer-overflow-client";
import { ExtendedBase } from "../structures/base";

export interface Command<T extends {}, ET extends ExtendedBase<T>> {
  execute(): Promise<ET | null>;
}

export interface Cacheable {
  getCacheId(): string;
}

export abstract class ClientCommand<T extends {}, ET extends ExtendedBase<T>>
  implements Command<T, ET>
{
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly answer_overflow_client: AnswerOverflowClient
  ) {}
  public abstract execute(): Promise<ET | null>;
}

export abstract class CreateCommand<
  T extends {},
  ET extends ExtendedBase<T>,
  CreateInput
> extends ClientCommand<T, ET> {
  constructor(
    answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly args: CreateInput
  ) {
    super(answer_overflow_client);
  }
  public abstract execute(): Promise<ET>;
}

export abstract class UpdateCommand<
  T extends {},
  ET extends ExtendedBase<T>,
  UpdateInput
> extends ClientCommand<T, ET> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly caller: ET,
    // eslint-disable-next-line no-unused-vars
    public readonly new_data: UpdateInput
  ) {
    super(answer_overflow_client);
  }
  public abstract execute(): Promise<ET>;
}

export abstract class GetCommand<T extends {}, ET extends ExtendedBase<T>, GetInput>
  extends ClientCommand<T, ET>
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

export abstract class Manager<
  T extends {},
  ET extends ExtendedBase<T>,
  CreateInput,
  UpdateInput,
  GetInput
> {
  public readonly cache = new Map<string, ET>();
  // eslint-disable-next-line no-unused-vars
  constructor(public answer_overflow_client: AnswerOverflowClient) {}

  public updateCache(data: ET): ET {
    const existing = this.cache.get(data.getCacheId());
    if (existing) {
      existing.updateCacheEntry(data.data);
      return existing;
    }
    this.cache.set(data.getCacheId(), data);
    return data;
  }

  // eslint-disable-next-line no-unused-vars
  public abstract get(where: GetInput): Promise<ET | null>;

  // eslint-disable-next-line no-unused-vars
  protected async _get(command: GetCommand<T, ET, GetInput>): Promise<ET | null> {
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
  public abstract create(args: CreateInput): Promise<ET>;

  protected async _create(update: CreateCommand<T, ET, CreateInput>): Promise<ET> {
    const created = await update.execute();
    return this.updateCache(created);
  }

  // eslint-disable-next-line no-unused-vars
  public abstract update(target: ET, updated_data: UpdateInput): Promise<ET>;

  protected async _update(command: UpdateCommand<T, ET, UpdateInput>): Promise<ET> {
    const created = await command.execute();
    return this.updateCache(created);
  }
}
