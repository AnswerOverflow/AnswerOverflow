import { EBase, DatabaseCommand } from "./manager";

export abstract class UpdateCommand<
  T extends EBase,
  UpdateArgs,
  GetType = T | T[]
> extends DatabaseCommand<T, UpdateArgs, GetType> {
  protected abstract update(): Promise<GetType>;

  // eslint-disable-next-line no-unused-vars
  protected abstract updateCache(new_value: GetType): void;
  // eslint-disable-next-line no-unused-vars
  constructor(public query: UpdateArgs, public manager: T["manager"], public readonly caller: T) {
    super(query, manager);
  }
  public async execute(): Promise<GetType> {
    const created = await this.update();
    this.updateCache(created);
    return created;
  }
}

export abstract class UpdateUniqueCommand<T extends EBase, CreateArgs> extends UpdateCommand<
  T,
  CreateArgs,
  T
> {}

export abstract class UpdateManyCommand<T extends EBase, CreateManyArgs> extends UpdateCommand<
  T,
  CreateManyArgs,
  T[]
> {}

export interface Update<Command extends UpdateUniqueCommand<any, any>, T> {
  // eslint-disable-next-line no-unused-vars
  update(query: Command["query"], caller: T): ReturnType<Command["execute"]>;
}
