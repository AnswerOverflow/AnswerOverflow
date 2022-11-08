import { Prisma, User } from "@prisma/client";
import { Manager } from "../manager";

export class UserManager extends Manager {
  public async createUser(data: Prisma.UserCreateInput): Promise<User | null> {
    const user = await this.answer_overflow_client.prisma.user.create({
      data,
    });
    return user;
  }
  public async getUser<T extends Prisma.UserFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>
  ) {
    const user = await this.answer_overflow_client.prisma.user.findUnique(args);
    return user;
  }
}
