import { AnswerOverflowClient } from "../answer-overflow-client";
import { BaseManaged } from "./base";

export abstract class Manager<
  T extends BaseManaged<any>,
  FindUniqueArgs,
  FindMnayArgs,
  CreateArgs,
  CreateManyArgs,
  UpdateArgs,
  UpdateManyArgs,
  DeleteArgs,
  DeleteManyArgs
> {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public answer_overflow_client: AnswerOverflowClient // eslint-disable-next-line no-unused-vars
  ) {}
  // eslint-disable-next-line no-unused-vars
  public abstract findUnique(query: FindUniqueArgs): Promise<T | null>;
  // eslint-disable-next-line no-unused-vars
  public abstract findMany(query: FindMnayArgs): Promise<T[]>;
  // eslint-disable-next-line no-unused-vars
  public abstract create(query: CreateArgs): Promise<T>;
  // eslint-disable-next-line no-unused-vars
  public abstract createMany(query: CreateManyArgs): Promise<number>;
  // eslint-disable-next-line no-unused-vars
  public abstract update(query: UpdateArgs): Promise<T>;
  // eslint-disable-next-line no-unused-vars
  public abstract updateMany(query: UpdateManyArgs): Promise<number>;
  // eslint-disable-next-line no-unused-vars
  public abstract delete(query: DeleteArgs): Promise<T>;
  // eslint-disable-next-line no-unused-vars
  public abstract deleteMany(query: DeleteManyArgs): Promise<number>;
}
