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

export type PermissionVariantsTest = {
  permissionsThatShouldWork: PermissionResolvable[];
  sourcesThatShouldWork?: Source[];
  failure_message: string;
  operation: (permission: PermissionResolvable, caller: Source) => Promise<unknown>;
};

export async function testAllVariants({
  permissionsThatShouldWork,
  operation,
  failure_message,
  sourcesThatShouldWork = ["discord-bot", "web-client"],
}: PermissionVariantsTest) {
  await Promise.all(
    sourceTypes.map((source) => {
      const permissions = Object.keys(PermissionFlagsBits) as PermissionResolvable[];
      return permissions.map(async (permission) => {
        let error: TRPCError | null = null;
        try {
          await operation(permission, source);
        } catch (err) {
          error = err as TRPCError;
        }

        // 3 ways to fail:
        // 1. Source is not allowed to use this endpoint and their call succeeds
        // 2. Source is allowed to use this endpoint, but doesn't have the required permissions and their call succeeds
        // 3. Source is allowed to use this endpoint, has the required permissions, but the operation failed

        const sourceIsAllowed = sourcesThatShouldWork.includes(source);
        const permissionsAreAllowed = permissionsThatShouldWork.includes(permission);
        // Source is not allowed to use this endpoint and their call succeeds
        if (!sourceIsAllowed && permissionsAreAllowed) {
          if (error === null) {
            expect(
              error,
              `Source ${source} is not allowed to use this endpoint which allows ${sourcesThatShouldWork.toString()} and their call succeeds. They have permission ${permission.toString()} - The permisions required are ${permissionsThatShouldWork.toString()}`
            ).not.toBeNull();
          } else {
            const errorLookup: Record<Source, string> = {
              "discord-bot": WEB_CLIENT_ONLY_CALL_ERROR_MESSAGE,
              "web-client": BOT_ONLY_CALL_ERROR_MESSAGE,
            };
            expect(
              error.message,
              `Expected error message for ${source} to be "${errorLookup[source]}" but got "${error.message}"`
            ).toBe(errorLookup[source]);
          }
        }

        // Source is allowed to use this endpoint, but doesn't have the required permissions and their call succeeds'
        if (sourceIsAllowed && !permissionsAreAllowed) {
          if (error === null) {
            expect(
              error,
              `Source ${source} is allowed to use this endpoint, but doesn't have the required permissions and their call succeeds. They have permission ${permission.toString()} - The permisions required are ${permissionsThatShouldWork.toString()}`
            ).not.toBeNull();
          } else {
            expect(
              error.message,
              `Expected error message for ${source} to be ${failure_message} but got ${error.message}`
            ).toBe(failure_message);
          }
        }

        // Source is allowed to use this endpoint, has the required permissions, but the operation failed
        if (sourceIsAllowed && permissionsAreAllowed) {
          expect(
            error,
            `Source ${source} is allowed to use this endpoint, has the required permissions, but the operation failed. They have permission ${permission.toString()} - The permisions required are ${permissionsThatShouldWork.toString()}`
          ).toBeNull();
        }
      });
    })
  );
}
