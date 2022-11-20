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

export type Delegates = Prisma.UserDelegate<false> | Prisma.ChannelDelegate<false>;

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

export interface PrismaOperationTypeMap<Data, T extends Delegates> {
  findFirst: Parameters<T["findFirst"]>[0];
  findFirstReturn: Data | null;

  findUnique: Parameters<T["findUnique"]>[0];
  findUniqueReturn: Data | null;

  findMany: Parameters<T["findMany"]>[0];
  findManyReturn: Data[];

  create: Parameters<T["create"]>[0];
  createReturn: Data;

  createMany: Parameters<T["createMany"]>[0];
  createManyReturn: Prisma.BatchPayload;

  update: Parameters<T["update"]>[0];
  updateReturn: Data;

  updateMany: Parameters<T["updateMany"]>[0];
  updateManyReturn: Prisma.BatchPayload;

  delete: Parameters<T["delete"]>[0];
  deleteReturn: Data;

  deleteMany: Parameters<T["deleteMany"]>[0];
  deleteManyReturn: Prisma.BatchPayload;
}

export abstract class TableManager<Table extends DbMethods, T extends DbTypeMap> {
  constructor(protected db: Table) {}

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
