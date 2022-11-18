import { Prisma } from "@prisma/client";
import { UpdateUniqueCommand } from "../../primitives/update";
import { User_Extended } from "./data";

export type User_UpdateArgs = Omit<Prisma.UserUpdateArgs, "select" | "include">;
export class User_UpdateUniqueCommand extends UpdateUniqueCommand<User_Extended, User_UpdateArgs> {
  protected async update(): Promise<User_Extended> {
    const data = await this.prisma.user.update(this.query);
    return new User_Extended(data, this.manager);
  }
  protected updateCache(new_value: User_Extended): void {
    this.manager.cache.set(new_value.id, new_value);
  }
}
