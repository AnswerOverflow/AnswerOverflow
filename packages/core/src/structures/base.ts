import { Cacheable } from "../managers/manager";

export abstract class ExtendedBase<T extends {}, UpdateInput> implements Cacheable {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public data: T
  ) {}
  public abstract getCacheId(): string;

  // eslint-disable-next-line no-unused-vars
  public abstract updateCacheEntry(data: T): void;
  // eslint-disable-next-line no-unused-vars
  public abstract update(update: UpdateInput): void;
}
