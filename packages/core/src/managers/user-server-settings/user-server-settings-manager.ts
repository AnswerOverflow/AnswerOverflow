import { Prisma, UserServerSettings } from "@prisma/client";
import { UserServerSettingsFlags } from "../../structures/user-server-settings";
import { addBitfield, changeBits } from "../../utils/bitfield";
import { Manager } from "../manager";

export class UserServerSettingsManager extends Manager {
  public async getUserServerSettings<T extends Prisma.UserServerSettingsFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserServerSettingsFindUniqueArgs>
  ) {
    const user_server_settings =
      await this.answer_overflow_client.prisma.userServerSettings.findUnique(args);
    if (!user_server_settings) return null;
    return addBitfield<typeof UserServerSettingsFlags, typeof user_server_settings>(
      UserServerSettingsFlags,
      user_server_settings.permissions,
      user_server_settings
    );
  }
  private async upsertUserServerSettings(
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
    if (!updated_user_server_settings) return null;
    return addBitfield<typeof UserServerSettingsFlags, typeof user_server_settings>(
      UserServerSettingsFlags,
      updated_user_server_settings.permissions,
      user_server_settings
    );
  }

  private async _changeUserServerSettingsFlag(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    flag: keyof typeof UserServerSettingsFlags,
    active: boolean,
    user_server_settings?: UserServerSettings
  ) {
    const updated_permissions = changeBits<typeof UserServerSettingsFlags>(
      UserServerSettingsFlags,
      user_server_settings?.permissions ?? 0,
      active,
      flag
    );
    const updated_user_server_settings = await this.upsertUserServerSettings(
      user,
      server,
      user_server_settings
        ? user_server_settings
        : {
            permissions: updated_permissions.value,
            user_id: user.id,
            server_id: server.id,
          }
    );
    return updated_user_server_settings;
  }

  public async revokeUserConsent(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    return this._changeUserServerSettingsFlag(
      user,
      server,
      "ALLOWED_TO_SHOW_MESSAGES",
      false,
      user_server_settings
    );
  }

  public async grantUserConsent(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    return this._changeUserServerSettingsFlag(
      user,
      server,
      "ALLOWED_TO_SHOW_MESSAGES",
      true,
      user_server_settings
    );
  }

  public async disableIndexing(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    return this._changeUserServerSettingsFlag(
      user,
      server,
      "SERVER_DISABLE_INDEXING",
      true,
      user_server_settings
    );
  }

  public async enableIndexing(
    user: Prisma.UserCreateInput,
    server: Prisma.ServerCreateInput,
    user_server_settings?: UserServerSettings
  ) {
    return this._changeUserServerSettingsFlag(
      user,
      server,
      "SERVER_DISABLE_INDEXING",
      false,
      user_server_settings
    );
  }
}
