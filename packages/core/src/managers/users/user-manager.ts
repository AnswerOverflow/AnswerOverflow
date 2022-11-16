import { User } from "@prisma/client";
import { UserExtended } from "../../structures/user";
import { Manager } from "../manager";

export type UserCreateArgs = { user: User };
export type UserUpdateArgs = Partial<Omit<User, "id" | "created_at">>;

export class UserManager extends Manager<User, UserExtended, UserCreateArgs, UserUpdateArgs> {
  public async get(id: string): Promise<UserExtended | null> {
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const results = await this.answer_overflow_client.prisma.user.findUnique({
      where: { id },
    });
    if (results == null) {
      return null;
    }
    return new UserExtended(results, this);
  }
  public override async create(args: UserCreateArgs): Promise<UserExtended> {
    const { user } = args;
    const created = await this.answer_overflow_client.prisma.user.create({
      data: {
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        id: user.id,
      },
    });
    return new UserExtended(created, this);
  }

  public async update(current: UserExtended, data: User): Promise<UserExtended> {
    const updated = await this.answer_overflow_client.prisma.user.update({
      where: {
        id: current.id,
      },
      data,
    });
    return new UserExtended(updated, this);
  }
}
