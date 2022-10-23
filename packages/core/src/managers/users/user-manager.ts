import { AnswerOverflowClient } from "../../answer-overflow-client";
import { User } from "../../structures/user/user";
import { Manager } from "../manager";
import { Prisma } from "@prisma/client";

export class UserManager extends Manager<User> {
  // eslint-disable-next-line no-unused-vars
  public client: AnswerOverflowClient;
  constructor(client: AnswerOverflowClient) {
    super();
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars
  public async edit(id: number, data: any): Promise<User | null> {
    return this.fetch(id);
  }

  public async fetch(id: number): Promise<User | null> {
    const user = await this.client.prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    return user ? User.fromPrisma(user) : null;
  }

  public async create(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.client.prisma.user.create({
      data: data,
    });
    return User.fromPrisma(user);
  }
}
