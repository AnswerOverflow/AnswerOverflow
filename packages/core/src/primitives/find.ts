import { EBase, DatabaseCommand } from "./manager";

export interface FindUnique<Command extends GetUniqueCommand<any, any>> {
  // eslint-disable-next-line no-unused-vars
  get(query: Command["query"]): ReturnType<Command["execute"]>;
}

export interface FindMany<Command extends GetManyCommand<any, any>> {
  // eslint-disable-next-line no-unused-vars
  findMany(query: Command["query"]): ReturnType<Command["execute"]>;
}

export abstract class GetCommand<
  T extends EBase,
  GetArgs,
  GetType = T | null | T[]
> extends DatabaseCommand<T, GetArgs, GetType> {
  protected abstract getFromCache(): GetType | null;
  protected abstract fetch(): Promise<GetType | null>;
}

export abstract class GetUniqueCommand<T extends EBase, GetArgs> extends GetCommand<
  T,
  GetArgs,
  T | null
> {
  public async execute(): Promise<T | null> {
    const data = this.getFromCache();
    if (data) return data;

    const fetched = await this.fetch();
    if (fetched == null) {
      return fetched;
    }
    this.updateCache(fetched);
    return fetched;
  }
}

export abstract class GetManyCommand<T extends EBase, GetManyArgs> extends GetCommand<
  T,
  GetManyArgs,
  T[]
> {
  public async execute(): Promise<T[]> {
    const fetched = await this.fetch();
    if (fetched == null) {
      return [];
    }
    this.updateCache(fetched);
    return fetched;
  }
}
