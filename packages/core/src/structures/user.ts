import { User } from "@prisma/client";
import { UserManager, UserUpdateArgs } from "../managers/users/user-manager";
import { ExtendedBase } from "./base";

export function getDefaultUser(id: string, name: string): User {
  return {
    id: id,
    email: null,
    name: name,
    avatar: null,
    created_at: null,
  };
}
export type UserEditableFields = { name?: string; avatar?: string; email?: string };

export class UserExtended extends ExtendedBase<User, UserUpdateArgs> {
  // eslint-disable-next-line no-unused-vars
  constructor(data: User, public readonly manager: UserManager) {
    super(data);
  }

  public async update(data: User) {
    return await this.manager.update(this, data);
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
