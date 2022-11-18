import { Prisma } from "@prisma/client";
import { Manager } from "../../primitives/manager";
import { User_Extended } from "./data";

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

export class UserManager extends Manager<
  User_Extended,
  User_FindUniqueArgs,
  User_FindManyArgs,
  User_CreateArgs,
  User_CreateManyArgs,
  User_UpdateArgs,
  User_UpdateManyArgs,
  User_DeleteArgs,
  User_DeleteManyArgs
> {
  public async findUnique(query: User_FindUniqueArgs): Promise<User_Extended | null> {
    const data = await this.answer_overflow_client.prisma.user.findUnique(query);
    if (!data) return null;
    return new User_Extended(data, this);
  }
  public async findMany(query: User_FindManyArgs): Promise<User_Extended[]> {
    const data = await this.answer_overflow_client.prisma.user.findMany(query);
    return data.map((d) => new User_Extended(d, this));
  }
  public async create(query: User_CreateArgs): Promise<User_Extended> {
    const data = await this.answer_overflow_client.prisma.user.create(query);
    return new User_Extended(data, this);
  }
  public async createMany(query: User_CreateManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.user.createMany(query);
    return data.count;
  }
  public async update(query: User_UpdateArgs): Promise<User_Extended> {
    const data = await this.answer_overflow_client.prisma.user.update(query);
    return new User_Extended(data, this);
  }
  public async updateMany(query: User_UpdateManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.user.updateMany(query);
    return data.count;
  }
  public async delete(query: User_DeleteArgs): Promise<User_Extended> {
    const data = await this.answer_overflow_client.prisma.user.delete(query);
    return new User_Extended(data, this);
  }
  public async deleteMany(query: User_DeleteManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.user.deleteMany(query);
    return data.count;
  }
}
