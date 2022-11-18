import { Manager } from "./manager";

export abstract class BaseManaged<T> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public data: T,
    // eslint-disable-next-line no-unused-vars
    public manager: Manager<BaseManaged<T>> // TODO: This requires overriding the constructor w/ the relevant manager type to get full typing info, in future see if it's possibe to determine that from here
  ) {}
  public abstract getCacheId(): string;

  // eslint-disable-next-line no-unused-vars
  public abstract updateCacheEntry(data: T): void;
}
