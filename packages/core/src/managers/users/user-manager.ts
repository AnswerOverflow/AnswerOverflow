import { User } from "../../structures/user/user";
import { Manager } from "../manager";

export class UserManager extends Manager<User> {
  // eslint-disable-next-line no-unused-vars
  public edit(id: string, data: any): User {
    console.log("edited");
    return new User({});
  }
  public fetch(id: string): User {
    console.log(id);

    return new User({});
  }
}
