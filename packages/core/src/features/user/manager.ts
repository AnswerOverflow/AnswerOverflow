import { Create } from "../../primitives/create";
import { Manager } from "../../primitives/manager";
import { User_CreateArgs, User_CreateCommand } from "./create";
import { User_Extended } from "./data";

export class User_Manager extends Manager<User_Extended> implements Create<User_CreateCommand> {
  public async create(query: User_CreateArgs): Promise<User_Extended> {
    return new User_CreateCommand(query, this).execute();
  }
}
