import { Prisma, UserServerSettings } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { Server_CreateInput } from "../server/server-manager";
import { User_Create } from "../user/user-manager";
import {
  parseUserServerSettings,
  serializeUserServerSettings,
  UserServerSettingsFields,
} from "./user-server-settings-utils";

export type UserServerSettings_Mutable = Partial<
  Pick<Prisma.UserServerSettingsCreateInput, "settings">
>;
export type UserServerSettings_Create = UserServerSettings_Mutable & {
  user_id: string;
  server_id: string;
};

type UserServerSettings_Extended = UserServerSettings & {
  flags: UserServerSettingsFields;
};

type UserServerSettingsDelegate = Prisma.UserServerSettingsDelegate<false>;

interface SafeUserServerSettingsPrismaOperations
  extends PrismaOperationTypeMap<
    UserServerSettings,
    UserServerSettingsDelegate,
    UserServerSettings_Create,
    UserServerSettings_Mutable
  > {
  data_extended: UserServerSettings_Extended;
}

type UserServerSettings_Upsert = {
  update: {
    user_server_settings?: Partial<UserServerSettingsFields>;
  };
  create: {
    user_server_settings?: {
      flags: Partial<UserServerSettingsFields>;
    };
    server: Server_CreateInput;
    user: User_Create;
  };
};

export class UserServerSettingsManager extends TableManager<
  UserServerSettingsDelegate,
  SafeUserServerSettingsPrismaOperations
> {
  protected override convertResponse(data: UserServerSettings): UserServerSettings_Extended {
    return {
      ...data,
      ...parseUserServerSettings(data.settings),
    };
  }
  public findByIds(user_id: string, server_id: string): Promise<UserServerSettings | null> {
    return this.findUnique({ where: { user_id_server_id: { user_id, server_id } } });
  }
  public async upsert(data: UserServerSettings_Upsert): Promise<UserServerSettings_Extended> {
    const existing_settings = await this.findUnique({
      where: {
        user_id_server_id: {
          user_id: data.create.user.id,
          server_id: data.create.server.id,
        },
      },
    });
    if (existing_settings) {
      const merged_settings = {
        ...parseUserServerSettings(existing_settings.settings),
        ...data.update.user_server_settings,
      };
      const new_bitfield_value = serializeUserServerSettings(merged_settings);
      return this.update({
        where: {
          user_id_server_id: {
            user_id: data.create.user.id,
            server_id: data.create.server.id,
          },
        },
        data: {
          settings: new_bitfield_value,
        },
      });
    } else {
      const server_create = this.client.servers.findCreate(data.create.server);
      const user_create = this.client.users.findCreate(data.create.user);
      const [server, user] = await Promise.all([server_create, user_create]);
      const user_server_settings_create = {
        ...data.create.user_server_settings,
        server_id: server.id,
        user_id: user.id,
      };
      return this.create({ data: user_server_settings_create });
    }
  }
}
