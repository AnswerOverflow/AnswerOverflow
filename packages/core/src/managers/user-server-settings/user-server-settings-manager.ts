import { Prisma, UserServerSettings } from "@prisma/client";
import {
  PermissionsBitField,
  UserServerSettingsFlags,
} from "../../structures/user-server-settings";
import { Manager } from "../manager";

export class UserServerSettingsManager extends Manager {
  public async getUserServerSettings<T extends Prisma.UserServerSettingsFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserServerSettingsFindUniqueArgs>
  ) {
    const user_server_settings =
      await this.answer_overflow_client.prisma.userServerSettings.findUnique(args);
    return user_server_settings;
  }

  public async upsertUserServerSettings(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings: UserServerSettings
  ) {
    const updated_user_server_settings =
      await this.answer_overflow_client.prisma.userServerSettings.upsert({
        create: {
          user: {
            connectOrCreate: {
              create: user,
              where: {
                id: user.id,
              },
            },
          },
          server: {
            connectOrCreate: {
              create: server,
              where: {
                id: server.id,
              },
            },
          },
          permissions: user_server_settings.permissions,
        },
        update: {
          permissions: user_server_settings.permissions,
        },
        where: {
          user_id_server_id: {
            user_id: user.id,
            server_id: server.id,
          },
        },
      });
    return updated_user_server_settings;
  }

  public async disableIndexing(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    return await this.upsertUserServerSettings(
      user,
      server,
      user_server_settings
        ? user_server_settings
        : {
            permissions: 1,
            user_id: user.id,
            server_id: server.id,
          }
    );
  }

  public async revokeUserConsent(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    const new_permissions = new PermissionsBitField<typeof UserServerSettingsFlags>(
      UserServerSettingsFlags,
      user_server_settings?.permissions ?? 0
    );
    new_permissions.clearFlag("ALLOWED_TO_SHOW_MESSAGES");
    return await this.upsertUserServerSettings(
      user,
      server,
      user_server_settings
        ? user_server_settings
        : {
            permissions: new_permissions.value,
            user_id: user.id,
            server_id: server.id,
          }
    );
  }

  public async grantUserConsent(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    const new_permissions = new PermissionsBitField<typeof UserServerSettingsFlags>(
      UserServerSettingsFlags,
      user_server_settings?.permissions ?? 0
    );
    new_permissions.setFlag("ALLOWED_TO_SHOW_MESSAGES");
    return await this.upsertUserServerSettings(
      user,
      server,
      user_server_settings
        ? user_server_settings
        : {
            permissions: new_permissions.value,
            user_id: user.id,
            server_id: server.id,
          }
    );
  }
}
