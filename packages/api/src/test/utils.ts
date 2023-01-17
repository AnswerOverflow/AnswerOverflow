import {
  DiscordAccount,
  getDefaultDiscordAccount,
  getDefaultServer,
  Server,
} from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { PermissionFlagsBits, PermissionResolvable, PermissionsBitField } from "discord.js";
import { Source, sourceTypes, createContextInner } from "~api/router/context";
import {
  INVALID_ROUTE_FOR_BOT_ERROR,
  INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
} from "~api/utils/permissions";

// returns a random snowflake as a string from 0 to 100000
export function randomId() {
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

export async function handleOperationCall<T>({
  operation,
  Success,
  Err,
}: {
  operation: () => Promise<T>;
  Success: (result: T) => void;
  Err: (error: TRPCError) => void;
}) {
  try {
    const result = await operation();
    Success(result);
  } catch (error) {
    if (error instanceof TRPCError) {
      return Err(error);
    }
    throw error;
  }
}

export type PermissionVariantsTest = {
  permissionsThatShouldWork: PermissionResolvable[];
  operation: (permission: PermissionResolvable, should_work: boolean) => Promise<void> | void;
};

export async function testAllPermissions({
  permissionsThatShouldWork,
  operation,
}: PermissionVariantsTest) {
  const permissions = Object.keys(PermissionFlagsBits) as PermissionResolvable[];
  await Promise.all(
    permissions.map(async (permission) => {
      const permissionIsAllowed = permissionsThatShouldWork.includes(permission);
      await operation(permission, permissionIsAllowed);
    })
  );
}

export type SourceVariantsTest = {
  sourcesThatShouldWork: Source[];
  operation: (source: Source, should_source_succeed: boolean) => Promise<void> | void;
};

export async function testAllSources({ sourcesThatShouldWork, operation }: SourceVariantsTest) {
  await Promise.all(
    sourceTypes.map(async (source) => {
      const sourceIsAllowed = sourcesThatShouldWork.includes(source);
      await operation(source, sourceIsAllowed);
    })
  );
}

export async function testAllVariants({
  sourcesThatShouldWork,
  permissionsThatShouldWork,
  operation,
  permission_failure_message,
}: {
  sourcesThatShouldWork: Source[];
  permissionsThatShouldWork: PermissionResolvable[];
  operation: (source: Source, permission: PermissionResolvable) => Promise<void> | void;
  permission_failure_message: string;
}) {
  await testAllSources({
    sourcesThatShouldWork,
    operation: (source, should_source_succeed) =>
      testAllPermissions({
        permissionsThatShouldWork,
        operation: async (permission, should_permission_succeed) => {
          try {
            await operation(source, permission);
            expect(should_permission_succeed).toBeTruthy();
            expect(should_source_succeed).toBeTruthy();
          } catch (error) {
            const error_lookup: Record<Source, string> = {
              "discord-bot": INVALID_ROUTE_FOR_BOT_ERROR,
              "web-client": INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
            };
            if (error instanceof TRPCError) {
              if (should_source_succeed && should_permission_succeed) {
                throw error;
              }
              if (!should_permission_succeed && should_source_succeed) {
                expect(error.message).toBe(permission_failure_message);
              }
              if (!should_source_succeed && should_permission_succeed) {
                expect(error.message).toBe(error_lookup[source]);
              }
              if (!should_source_succeed && !should_permission_succeed) {
                const expected_error_message = `${error_lookup[source]}\n${permission_failure_message}`;
                const sorted_actual_error_message = [...error.message].sort().join("");
                const sorted_expected_error_message = [...expected_error_message].sort().join("");
                expect(sorted_actual_error_message).toBe(sorted_expected_error_message);
              }
            }
          }
        },
      }),
  });
}
