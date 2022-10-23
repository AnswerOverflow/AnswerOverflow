import { User } from "./user";

export class UserManager {
  // eslint-disable-next-line no-unused-vars
  public get(id: string): User {
    return new User();
  }
}
