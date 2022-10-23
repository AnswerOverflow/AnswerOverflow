import { User } from "../structures/user/user";
import { Manager } from "./manager";

export class UserManager extends Manager<User> {
  public fetch(id: string): User {
    console.log(id);

    return new User();
  }
}
