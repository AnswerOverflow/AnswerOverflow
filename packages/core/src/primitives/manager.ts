import { PrismaClient } from "@prisma/client";
import { AnswerOverflowClient } from "../answer-overflow-client";
import { BaseManaged } from "./base";

export type EBase = BaseManaged<any>;

export class Cache<T extends EBase> {
  public readonly cache = new Map<string, T>();

  public set(id: string, data: T) {
    this.cache.set(id, data);
  }

  public get(id: string): T | null {
    const data = this.cache.get(id);
    if (data == null) {
      return null;
    }
    return data;
  }
}
// make classes that run commands?
export abstract class DatabaseCommand<T extends EBase, Query, GetType> {
  public abstract execute(): Promise<GetType>;
  // eslint-disable-next-line no-unused-vars
  protected abstract updateCache(new_value: GetType): void;
  public readonly prisma: PrismaClient;
  public readonly cache: T["manager"]["cache"];
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly query: Query,
    // eslint-disable-next-line no-unused-vars
    public readonly manager: T["manager"]
  ) {
    this.prisma = manager.answer_overflow_client.prisma;
    this.cache = manager.cache;
  }
}

export abstract class Manager<T extends EBase> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public answer_overflow_client: AnswerOverflowClient,
    // eslint-disable-next-line no-unused-vars
    public readonly cache: Cache<T>
  ) {}
}
