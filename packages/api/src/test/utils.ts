import {
  DiscordAccount,
  getDefaultDiscordAccount,
  getDefaultServer,
  Server,
} from "@answeroverflow/db";
import type { TRPCError } from "@trpc/server";
import { PermissionFlagsBits, PermissionResolvable, PermissionsBitField } from "discord.js";
import { Source, sourceTypes, createContextInner } from "~api/router/context";
import {
  BOT_ONLY_CALL_ERROR_MESSAGE,
  WEB_CLIENT_ONLY_CALL_ERROR_MESSAGE,
} from "~api/utils/permissions";

// returns a random snowflake as a string from 0 to 100000
function randomId() {
  return Math.floor(Math.random() * 100000).toString();
}

export async function mockAccount(
  server: Server,
  caller: Source,
  permissions: PermissionResolvable = PermissionsBitField.Default,
  override: Partial<DiscordAccount> = {}
) {
  const account = getDefaultDiscordAccount({
    id: randomId(),
    name: "test-user-owner",
    ...override,
  });
  const ctx = await createCtxWithServers({
    user: account,
    permissions: permissions,
    server: server,
    caller: caller,
  });
  return { account, ctx };
}

export function mockServer(override: Partial<Server> = {}) {
  return getDefaultServer({
    id: randomId(),
    name: "test-server",
    ...override,
  });
}

export async function createAnswerOverflowBotCtx() {
  return createContextInner({
    session: null,
    source: "discord-bot",
    user_servers: undefined,
    discord_account: {
      id: process.env.DISCORD_CLIENT_ID ?? process.env.VITE_DISCORD_CLIENT_ID,
      avatar: null,
      username: "test",
      discriminator: "0000",
    },
  });
}

type CtxOverride = {
  server: {
    id: string;
    name: string;
  };
  caller: Source;
  permissions: PermissionResolvable;
  user: DiscordAccount;
};

export function createCtxWithServers(input: CtxOverride) {
  return createContextInner({
    session: null,
    source: input.caller,
    discord_account: {
      id: input.user.id,
      avatar: null,
      username: input.user.name,
      discriminator: "0000",
    },
    user_servers: [
      {
        features: [],
        id: input.server.id,
        name: input.server.name,
        owner: true,
        icon: null,
        permissions: Number(PermissionsBitField.resolve(input.permissions)),
      },
    ],
  });
}

export type PermissionVariantsTest<T> = {
  permissionsThatShouldWork: PermissionResolvable[];
  Success: (result: T, permission: PermissionResolvable, is_permission_allowed: boolean) => void;
  Err: (error: TRPCError, permission: PermissionResolvable, is_permission_allowed: boolean) => void;
  operation: (permission: PermissionResolvable) => Promise<T>;
};

export async function testAllPermissions<T>({
  permissionsThatShouldWork,
  operation,
  Success,
  Err,
}: PermissionVariantsTest<T>) {
  const permissions = Object.keys(PermissionFlagsBits) as PermissionResolvable[];
  await Promise.all(
    permissions.map(async (permission) => {
      let error: TRPCError | null = null;
      const permissionsAreAllowed = permissionsThatShouldWork.includes(permission);
      try {
        const data = await operation(permission);
        Success(data, permission, permissionsAreAllowed);
      } catch (err) {
        error = err as TRPCError;
        Err(error, permission, permissionsAreAllowed);
      }
    })
  );
}

export async function testAllVariants<T>({
  permissionsThatShouldWork,
  operation,
  failure_message,
  sourcesThatShouldWork = ["discord-bot", "web-client"],
}: Omit<PermissionVariantsTest<T>, "operation" | "Success" | "Err"> & {
  failure_message: string;
  sourcesThatShouldWork?: Source[];
  operation: (source: Source, permission: PermissionResolvable) => Promise<T>;
}) {
  await Promise.all(
    sourceTypes.map((source) => {
      const sourceIsAllowed = sourcesThatShouldWork.includes(source);
      const errorLookup: Record<Source, string> = {
        "discord-bot": WEB_CLIENT_ONLY_CALL_ERROR_MESSAGE,
        "web-client": BOT_ONLY_CALL_ERROR_MESSAGE,
      };
      return testAllPermissions({
        permissionsThatShouldWork,
        operation: (permission) => operation(source, permission),
        Success(_result, permission, is_permission_allowed) {
          expect(
            is_permission_allowed,
            `Expected ${source} to be allowed to use this endpoint with permission ${permission.toString()} but they were not`
          ).toBeTruthy();
          expect(sourceIsAllowed).toBeTruthy();
        },
        Err(error, permission, is_permission_allowed) {
          if (!is_permission_allowed && sourceIsAllowed) {
            expect(
              error.message,
              `Expected error message for ${source} to be "${errorLookup[source]}" but got "${error.message}"`
            ).toBe(failure_message);
          }
          if (!sourceIsAllowed && is_permission_allowed) {
            expect(
              error.message,
              `Expected error message for ${source} to be "${errorLookup[source]}" but got "${error.message}"`
            ).toBe(errorLookup[source]);
          }
          if (is_permission_allowed && sourceIsAllowed) {
            expect(
              error,
              `Expected ${source} to be allowed to use this endpoint with permission ${permission.toString()} but they were not`
            ).toBeNull();
          }
        },
      });
    })
  );
}
