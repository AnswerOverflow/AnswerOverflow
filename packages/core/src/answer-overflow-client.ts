import { PrismaClient } from "@prisma/client";
import { UserManager } from "./managers/users/user-manager";

export class AnswerOverflowClient {
  public users: UserManager = new UserManager(this);
  public hi: string = "hi ";
  public prisma: PrismaClient = new PrismaClient();
}

// if this is not here hot reloading breaks, I have no idea why
export class _ {}
