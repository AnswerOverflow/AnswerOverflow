/* eslint-disable no-unused-vars */

import { Prisma } from "@prisma/client";
import { AnswerOverflowClient } from "../answer-overflow-client";

export interface DbMethods {
  findFirst(data: unknown): Promise<unknown | null>;
  findUnique(data: unknown): Promise<unknown | null>;
  findMany(data: unknown): Promise<unknown | null>;
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
  data: unknown;
  data_extended: this["data"];

  findFirst: unknown;
  findUnique: unknown;
  findMany: unknown;

  create: unknown;
  createMany: unknown;

  update: unknown;
  updateMany: unknown;

  upsert: unknown;

  delete: unknown;
  deleteMany: unknown;
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
  data: Data;
  data_extended: Data;

  // type is the first parameter of find first in T, omitting where
  findFirst: OmitSelectInclude<FirstParam<T["findFirst"]>>;

  findUnique: OmitSelectInclude<FirstParam<T["findUnique"]>>;

  findMany: OmitSelectInclude<FirstParam<T["findMany"]>>;

  create: OmitSelectInclude<ModifyUniqueDataField<FirstParam<T["create"]>, CreateData>>;
  createMany: OmitSelectInclude<ModifyManyDataField<FirstParam<T["createMany"]>, CreateData>>;

  update: OmitSelectInclude<ModifyUniqueDataField<FirstParam<T["update"]>, UpdateData>>;
  updateMany: OmitSelectInclude<ModifyManyDataField<FirstParam<T["updateMany"]>, UpdateData>>;

  upsert: unknown;
  upsertReturn: unknown;

  delete: OmitSelectInclude<FirstParam<T["delete"]>>;
  deleteMany: OmitSelectInclude<FirstParam<T["deleteMany"]>>;
}

export abstract class TableManager<Table extends DbMethods, T extends DbTypeMap> {
  constructor(protected db: Table, protected client: AnswerOverflowClient) {}

  protected convertResponse(data: T["data"]): T["data_extended"] {
    return data;
  }

  public async findFirst(data: T["findFirst"]): Promise<T["data_extended"] | null> {
    return this.convertResponse(await this.db.findFirst(data));
  }

  public async findUnique(data: T["findUnique"]): Promise<T["data_extended"] | null> {
    return this.convertResponse(await this.db.findUnique(data));
  }

  public async findMany(data: T["findMany"]): Promise<T["data_extended"] | null> {
    return this.convertResponse(await this.db.findMany(data));
  }

  protected async create(data: T["create"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.create(data));
  }

  protected async createMany(data: T["createMany"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.createMany(data));
  }

  protected async update(data: T["update"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.update(data));
  }

  protected async updateMany(data: T["updateMany"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.updateMany(data));
  }

  public async delete(data: T["delete"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.delete(data));
  }

  public async deleteMany(data: T["deleteMany"]): Promise<T["data_extended"]> {
    return this.convertResponse(await this.db.deleteMany(data));
  }

  public abstract upsert(data: T["upsert"]): Promise<unknown>;
}
