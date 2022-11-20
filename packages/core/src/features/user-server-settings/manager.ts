import { Prisma, UserServerSettings } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { Server_CreateInput } from "../server/manager";
import { User_Create } from "../user/manager";

export type UserServerSettings_Mutable = Partial<
  Pick<Prisma.UserServerSettingsCreateInput, "settings">
>;
export type UserServerSettings_Create = UserServerSettings_Mutable & {
  user_id: string;
  server_id: string;
};

export type UserServerSettings_CreateInput = Prisma.UserServerSettingsCreateInput;

type UserServerSettingsDelegate = Prisma.UserServerSettingsDelegate<false>;

interface SafeUserServerSettingsPrismaOperations
  extends PrismaOperationTypeMap<
    UserServerSettings,
    UserServerSettingsDelegate,
    UserServerSettings_Create,
    UserServerSettings_Mutable
  > {}

type UserServerSettings_CreateWithDependencies = {
  user_server_settings?: UserServerSettings_Mutable;
  server: Server_CreateInput;
  user: User_Create;
};

export class UserServerSettingsManager extends TableManager<
  UserServerSettingsDelegate,
  SafeUserServerSettingsPrismaOperations
> {
  public async createWithDependencies(
    data: UserServerSettings_CreateWithDependencies
  ): Promise<UserServerSettings> {
    const server_create = this.client.servers.findCreate(data.server);
    const user_create = this.client.users.findCreate(data.user);
    const [server, user] = await Promise.all([server_create, user_create]);
    const user_server_settings_create = {
      ...data.user_server_settings,
      server_id: server.id,
      user_id: user.id,
    };
    return this.create({ data: user_server_settings_create });
  }
}
