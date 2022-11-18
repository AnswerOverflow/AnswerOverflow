import { User } from "@prisma/client";
import { BaseManaged } from "../../primitives/base";
import { UserManager } from "./manager";

export function getDefaultUser(id: string, name: string): User {
  return {
    id: id,
    email: null,
    name: name,
    avatar: null,
    created_at: null,
  };
}
export type User_Updateable = Partial<Pick<User, "avatar" | "email" | "name">>;
export type User_Creatable = Pick<User, "id" | "name"> & Partial<User_Updateable>;

export class User_Extended extends BaseManaged<User> {
  // eslint-disable-next-line no-unused-vars
  constructor(data: User, public readonly manager: UserManager) {
    super(data, manager);
  }

  get name() {
    return this.data.name;
  }
  get id() {
    return this.data.id;
  }
  get avatar() {
    return this.data.avatar;
  }
  get created_at() {
    return this.data.created_at;
  }
  get email() {
    return this.data.email;
  }
  public getCacheId(): string {
    return this.data.id;
  }
  public updateCacheEntry(data: User): void {
    this.data = data;
  }
}
