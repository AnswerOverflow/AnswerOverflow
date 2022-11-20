/* eslint-disable no-unused-vars */

import { Prisma } from "@prisma/client";

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
  constructor(protected db: Table) {}

  public findFirst(data: T["findFirst"]): Promise<T["findFirstReturn"]> {
    return this.db.findFirst(data);
  }

  public findUnique(data: T["findUnique"]): Promise<T["findUniqueReturn"]> {
    return this.db.findUnique(data);
  }

  public findMany(data: T["findMany"]): Promise<T["findManyReturn"]> {
    return this.db.findMany(data);
  }

  public create(data: T["create"]): Promise<T["createReturn"]> {
    return this.db.create(data);
  }

  public createMany(data: T["createMany"]): Promise<T["createManyReturn"]> {
    return this.db.createMany(data);
  }

  public update(data: T["update"]): Promise<T["updateReturn"]> {
    return this.db.update(data);
  }

  public updateMany(data: T["updateMany"]): Promise<T["updateManyReturn"]> {
    return this.db.updateMany(data);
  }

  public delete(data: T["delete"]): Promise<T["deleteReturn"]> {
    return this.db.delete(data);
  }

  public deleteMany(data: T["deleteMany"]): Promise<T["deleteManyReturn"]> {
    return this.db.deleteMany(data);
  }
}
