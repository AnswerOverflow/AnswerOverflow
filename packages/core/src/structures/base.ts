import { Manager } from "../managers/manager";

export abstract class Base<T extends {}> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public data: T,
    // eslint-disable-next-line no-unused-vars
    public readonly manager: Manager<T>
  ) {}

  public async edit<U extends {}>(update_data: U) {
    const new_data = { ...this.data, ...update_data };
    return await this.manager.edit(new_data);
  }
}
