import { UserManager } from "./managers/user-manager";

export class AnswerOverflowClient {
  public users: UserManager = new UserManager();
  public hi: string = "HELLO  TEST";
}

// if this is not here hot reloading breaks, I have no idea why
export class _ {}
