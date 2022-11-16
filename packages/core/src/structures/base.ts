import { Manager } from "../managers/manager";

export abstract class ExtendedBase<T extends {}> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public data: T,
    // eslint-disable-next-line no-unused-vars
    public readonly manager: Manager<T, ExtendedBase<T>>
  ) {}

  public abstract getCacheId(): string;

  // eslint-disable-next-line no-unused-vars
  public abstract updateCacheEntry(data: T): void;

  public async edit<U extends {}>(update_data: U) {
    const new_data = { ...this.data, ...update_data };
    return await this.manager.edit(new_data);
  }
}
