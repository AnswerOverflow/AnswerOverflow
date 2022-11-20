import { Prisma, User } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";

export type User_Mutable = Partial<Pick<Prisma.UserCreateInput, "name" | "avatar" | "email">>;
export type User_Create = Pick<Prisma.UserCreateInput, "id" | "name"> & User_Mutable;

// Create
export type User_CreateArgs = {
  data: User_Create;
};
export type User_CreateManyArgs = {
  data: Prisma.Enumerable<User_Create>;
};

// Update
export type User_UpdateArgs = {
  data: User_Mutable;
  where: Prisma.UserWhereUniqueInput;
};
export type User_UpdateManyArgs = {
  data: User_Mutable;
  where: Prisma.UserWhereInput;
};

// Find
export type User_FindUniqueArgs = Pick<Prisma.UserFindUniqueArgs, "where">;
export type User_FindManyArgs = Pick<
  Prisma.UserFindManyArgs,
  "cursor" | "distinct" | "orderBy" | "skip" | "take" | "where"
>;

// Delete
export type User_DeleteArgs = Pick<Prisma.UserDeleteArgs, "where">;
export type User_DeleteManyArgs = Prisma.UserDeleteManyArgs;

type UserType = Prisma.UserDelegate<false>;

interface SafeUserPrismaOperations extends PrismaOperationTypeMap<User, UserType> {
  findUnique: User_FindUniqueArgs;
  findMany: User_FindManyArgs;

  create: User_CreateArgs;
  createMany: User_CreateManyArgs;

  update: User_UpdateArgs;
  updateMany: User_UpdateManyArgs;

  delete: User_DeleteArgs;
  deleteMany: User_DeleteManyArgs;
}

export class UserManager extends TableManager<UserType, SafeUserPrismaOperations> {}
