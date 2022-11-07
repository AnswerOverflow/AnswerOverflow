export abstract class Manager<Type> {
  public cache = new Map<number, Type>();
  public get = (id: number) => {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    return this.fetch(id);
  };
  // eslint-disable-next-line no-unused-vars
  public abstract fetch(id: any): Promise<Type | null>;
  // eslint-disable-next-line no-unused-vars
  public abstract edit(id: number, data: any): Promise<Type | null>;
}
