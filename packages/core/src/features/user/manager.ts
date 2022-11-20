import { Prisma, User } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";

export type User_Mutable = Partial<Pick<Prisma.UserCreateInput, "name" | "avatar" | "email">>;
export type User_Create = Prisma.UserCreateInput & User_Mutable;

type UserDelegate = Prisma.UserDelegate<false>;

interface SafeUserPrismaOperations
  extends PrismaOperationTypeMap<User, UserDelegate, User_Create, User_Mutable> {}

export class UserManager extends TableManager<UserDelegate, SafeUserPrismaOperations> {
  public findById(id: string): Promise<User | null> {
    return this.findUnique({ where: { id } });
  }
}
