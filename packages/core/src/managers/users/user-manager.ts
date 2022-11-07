import { AnswerOverflowClient } from "../../answer-overflow-client";
import { Prisma } from "@prisma/client";
import { user } from "@prisma/client";

export class UserManager {
  // eslint-disable-next-line no-unused-vars
  constructor(private answer_overflow_client: AnswerOverflowClient) {}
  public async createUser(data: Prisma.userCreateInput): Promise<user | null> {
    const user = await this.answer_overflow_client.prisma.user.create({
      data,
    });
    return user;
  }
  public async getUser<T extends Prisma.userFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.userFindUniqueArgs>
  ) {
    const user = await this.answer_overflow_client.prisma.user.findUnique(args);
    return user;
  }
}
