import { BaseManaged } from "./base";
import { DatabaseCommand } from "./manager";

export abstract class GetCommand<
  T extends BaseManaged<any>,
  GetArgs,
  GetType = T | null | T[]
> extends DatabaseCommand<T, GetArgs, GetType> {
  protected abstract getFromCache(): GetType | null;
  protected abstract fetch(): Promise<GetType | null>;
}

export abstract class GetUniqueCommand<T extends BaseManaged<any>, GetArgs> extends GetCommand<
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

export abstract class GetManyCommand<T extends BaseManaged<any>, GetManyArgs> extends GetCommand<
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
