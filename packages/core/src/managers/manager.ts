export abstract class Manager<Type> {
  public cache = new Map<string, Type>();
  public get = (id: string) => {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    return this.fetch(id);
  };
  // eslint-disable-next-line no-unused-vars
  public abstract fetch(id: string): Type;
  // eslint-disable-next-line no-unused-vars
  public abstract edit(id: string, data: any): Type;
}
