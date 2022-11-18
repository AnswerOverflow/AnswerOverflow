import { EBase, DatabaseCommand } from "./manager";

export abstract class CreateCommand<
  T extends EBase,
  CreateArgs,
  GetType = T | T[]
> extends DatabaseCommand<T, CreateArgs, GetType> {
  protected abstract create(): Promise<GetType>;

  // eslint-disable-next-line no-unused-vars
  protected abstract updateCache(new_value: GetType): void;

  public async execute(): Promise<GetType> {
    const created = await this.create();
    this.updateCache(created);
    return created;
  }
}

export abstract class CreateUniqueCommand<T extends EBase, CreateArgs> extends CreateCommand<
  T,
  CreateArgs,
  T
> {}

export abstract class CreateManyCommand<T extends EBase, CreateManyArgs> extends CreateCommand<
  T,
  CreateManyArgs,
  T[]
> {}

export interface Create<Command extends CreateUniqueCommand<any, any>> {
  // eslint-disable-next-line no-unused-vars
  create(query: Command["query"]): ReturnType<Command["execute"]>;
}
