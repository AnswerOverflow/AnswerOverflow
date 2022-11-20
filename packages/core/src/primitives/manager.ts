/* eslint-disable no-unused-vars */

import { Prisma } from "@prisma/client";
import { AnswerOverflowClient } from "../answer-overflow-client";

export interface DbMethods {
  findFirst(data: unknown): Promise<unknown>;
  findUnique(data: unknown): Promise<unknown>;
  findMany(data: unknown): Promise<unknown>;
  create(data: unknown): Promise<unknown>;
  createMany(data: unknown): Promise<unknown>;
  update(data: unknown): Promise<unknown>;
  updateMany(data: unknown): Promise<unknown>;
  delete(data: unknown): Promise<unknown>;
  deleteMany(data: unknown): Promise<unknown>;
}

export type Delegates =
  | Prisma.UserDelegate<false>
  | Prisma.UserServerSettingsDelegate<false>
  | Prisma.UserChannelSettingsDelegate<false>
  | Prisma.ServerDelegate<false>
  | Prisma.ServerSettingsDelegate<false>
  | Prisma.ChannelDelegate<false>
  | Prisma.ChannelSettingsDelegate<false>;

export interface DbTypeMap {
  findFirst: unknown;
  findFirstReturn: unknown;

  findUnique: unknown;
  findUniqueReturn: unknown;

  findMany: unknown;
  findManyReturn: unknown;

  create: unknown;
  createReturn: unknown;

  createMany: unknown;
  createManyReturn: unknown;

  update: unknown;
  updateReturn: unknown;

  updateMany: unknown;
  updateManyReturn: unknown;

  delete: unknown;
  deleteReturn: unknown;

  deleteMany: unknown;
  deleteManyReturn: unknown;
}

type OmitSelectInclude<T> = {
  [Property in keyof T as Exclude<Property, "select" | "include">]: T[Property];
};

type ModifyUniqueDataField<T, K> = Omit<T, "data"> & {
  data: K;
};

type ModifyManyDataField<T, K> = Omit<T, "data"> & {
  data: Prisma.Enumerable<K>;
};

// type for the first paramter of a function
type FirstParam<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;

export interface PrismaOperationTypeMap<
  Data,
  T extends Delegates,
  CreateData extends FirstParam<T["create"]>["data"],
  UpdateData extends FirstParam<T["update"]>["data"]
> {
  // type is the first parameter of find first in T, omitting where
  findFirst: OmitSelectInclude<FirstParam<T["findFirst"]>>;
  findFirstReturn: Data | null;

  findUnique: OmitSelectInclude<FirstParam<T["findUnique"]>>;
  findUniqueReturn: Data | null;

  findMany: OmitSelectInclude<FirstParam<T["findMany"]>>;
  findManyReturn: Data[];

  create: OmitSelectInclude<ModifyUniqueDataField<FirstParam<T["create"]>, CreateData>>;
  createReturn: Data;
  createMany: OmitSelectInclude<ModifyManyDataField<FirstParam<T["createMany"]>, CreateData>>;
  createManyReturn: Prisma.BatchPayload;

  update: OmitSelectInclude<ModifyUniqueDataField<FirstParam<T["update"]>, UpdateData>>;
  updateReturn: Data;
  updateMany: OmitSelectInclude<ModifyManyDataField<FirstParam<T["updateMany"]>, UpdateData>>;
  updateManyReturn: Prisma.BatchPayload;

  delete: OmitSelectInclude<FirstParam<T["delete"]>>;
  deleteReturn: Data;
  deleteMany: OmitSelectInclude<FirstParam<T["deleteMany"]>>;
  deleteManyReturn: Prisma.BatchPayload;
}

export abstract class TableManager<Table extends DbMethods, T extends DbTypeMap> {
  constructor(protected db: Table, protected client: AnswerOverflowClient) {}

  public async findFirst(data: T["findFirst"]): Promise<T["findFirstReturn"]> {
    return await this.db.findFirst(data);
  }

  public async findUnique(data: T["findUnique"]): Promise<T["findUniqueReturn"]> {
    return await this.db.findUnique(data);
  }

  public async findMany(data: T["findMany"]): Promise<T["findManyReturn"]> {
    return await this.db.findMany(data);
  }

  public async create(data: T["create"]): Promise<T["createReturn"]> {
    return await this.db.create(data);
  }

  public async createMany(data: T["createMany"]): Promise<T["createManyReturn"]> {
    return await this.db.createMany(data);
  }

  public async update(data: T["update"]): Promise<T["updateReturn"]> {
    return await this.db.update(data);
  }

  public async updateMany(data: T["updateMany"]): Promise<T["updateManyReturn"]> {
    return await this.db.updateMany(data);
  }

  public async delete(data: T["delete"]): Promise<T["deleteReturn"]> {
    return await this.db.delete(data);
  }

  public async deleteMany(data: T["deleteMany"]): Promise<T["deleteManyReturn"]> {
    return await this.db.deleteMany(data);
  }
}
