import { Prisma, User } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { findOrCreate } from "../../utils/operations";

export type User_Mutable = Partial<Pick<Prisma.UserCreateInput, "name" | "avatar" | "email">>;
export type User_Create = Pick<Prisma.UserCreateInput, "id" | "name"> & User_Mutable;

type UserDelegate = Prisma.UserDelegate<false>;

interface SafeUserPrismaOperations
  extends PrismaOperationTypeMap<User, UserDelegate, User_Create, User_Mutable> {}

export class UserManager extends TableManager<UserDelegate, SafeUserPrismaOperations> {
  public async upsert(data: User_Create): Promise<User> {
    const user = await this.findById(data.id);
    if (user) {
      return this.update({ where: { id: data.id }, data });
    }
    return this.create({ data });
  }
  public findById(id: string): Promise<User | null> {
    return this.findUnique({ where: { id } });
  }
  public async findCreate(input: User_Create): Promise<User> {
    return findOrCreate(
      () => this.findById(input.id),
      () => this.create({ data: input })
    );
  }
}
