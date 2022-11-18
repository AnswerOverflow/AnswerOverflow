import { User_Creatable, User_Extended } from "./data";
import { CreateUniqueCommand } from "../../primitives/create";

//UserCreateArgsPick<User, "id" | "name"> & Partial<User_Mutable>;

export class User_CreateCommand extends CreateUniqueCommand<User_Extended, User_Creatable> {
  protected async create(): Promise<User_Extended> {
    const data = await this.prisma.user.create(this.query);
    return new User_Extended(data, this.manager);
  }
  protected updateCache(new_value: User_Extended): void {
    this.manager.cache.set(new_value.id, new_value);
  }
}
