import {
  Channel,
  DiscordAccount,
  getDefaultChannel,
  getDefaultDiscordAccount,
  getDefaultServer,
  getDefaultThread,
  Server,
} from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import {
  ChannelType,
  PermissionFlagsBits,
  PermissionResolvable,
  PermissionsBitField,
} from "discord.js";
import { Source, sourceTypes, createContextInner } from "~api/router/context";
import {
  INVALID_ROUTE_FOR_BOT_ERROR,
  INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
} from "~api/utils/permissions";

export function randomId() {
  return Math.floor(Math.random() * 10000000).toString();
}

export function mockAccount(override: Partial<DiscordAccount> = {}) {
  const account = getDefaultDiscordAccount({
    id: randomId(),
    name: "test-user",
    ...override,
  });
  return account;
}

export async function mockAccountWithServersCallerCtx(
  server: Server,
  caller: Source,
  permissions: PermissionResolvable = PermissionsBitField.Default,
  override: Partial<DiscordAccount> = {}
) {
  const account = mockAccount(override);
  const ctx = await createCtxWithServers({
    user: account,
    permissions: permissions,
    server: server,
    caller: caller,
  });
  return { account, ctx };
}

export async function mockAccountCallerCtx(caller: Source, override: Partial<DiscordAccount> = {}) {
  const account = mockAccount(override);
  const ctx = await createContextInner({
    session: null,
    source: caller,
    discord_account: {
      id: account.id,
      avatar: null,
      username: account.name,
      discriminator: "0000",
    },
    user_servers: undefined,
  });
  return { account, ctx };
}

export function mockServer(override: Partial<Server> = {}) {
  return getDefaultServer({
    id: randomId(),
    name: "test-server",
    icon: "ASDASDASDASDsd",
    ...override,
  });
}

export function mockChannel(server: Server, override?: Omit<Partial<Channel>, "server_id">) {
  return getDefaultChannel({
    id: randomId(),
    name: "test-channel",
    server_id: server?.id ?? randomId(),
    type: ChannelType.GuildText,
    parent_id: null,
    ...override,
  });
}

export function mockThread(
  parent: Channel,
  override?: Omit<Partial<Channel>, "parent_id" | "server_id">
) {
  return getDefaultThread({
    id: randomId(),
    name: "test-thread",
    server_id: parent.server_id,
    type: ChannelType.PublicThread,
    parent_id: parent.id,
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
        owner: false,
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
  operation: (
    permission: PermissionResolvable,
    is_permission_allowed: boolean
  ) => Promise<void> | void;
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
  sourcesThatShouldWork?: Source[];
  operation: (source: Source, should_source_succeed: boolean) => Promise<void> | void;
};

export async function testAllSources({
  sourcesThatShouldWork = [...sourceTypes],
  operation,
}: SourceVariantsTest) {
  await Promise.all(
    sourceTypes.map(async (source) => {
      const sourceIsAllowed = sourcesThatShouldWork.includes(source);
      await operation(source, sourceIsAllowed);
    })
  );
}

export async function testAllVariants({
  sourcesThatShouldWork = [...sourceTypes],
  permissionsThatShouldWork = Object.keys(PermissionFlagsBits) as PermissionResolvable[],
  operation,
  permission_failure_message = "",
}: {
  sourcesThatShouldWork?: Source[];
  permissionsThatShouldWork?: PermissionResolvable[];
  permission_failure_message?: string;
  operation: (input: {
    source: Source;
    permission: PermissionResolvable;
    should_source_succeed: boolean;
    should_permission_succeed: boolean;
  }) => Promise<void> | void;
}) {
  await testAllSources({
    sourcesThatShouldWork,
    operation: (source, should_source_succeed) =>
      testAllPermissions({
        permissionsThatShouldWork,
        operation: async (permission, should_permission_succeed) => {
          try {
            await operation({
              source,
              permission,
              should_source_succeed,
              should_permission_succeed,
            });
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
              const makeExpectErrorMessage = (expected_message: string, actual_message: string) =>
                `Failure from ${source} with permissions ${permission.toString()}.\nExpected message:\n-----\n${expected_message}\n-----\n\n\nActual Message:\n\n-----\n${actual_message}\n-----\n\n`;

              if (!should_permission_succeed && should_source_succeed) {
                expect(
                  error.message,
                  makeExpectErrorMessage(permission_failure_message, error.message)
                ).toBe(permission_failure_message);
              }
              if (!should_source_succeed && should_permission_succeed) {
                expect(
                  error.message,
                  makeExpectErrorMessage(error_lookup[source], error.message)
                ).toBe(error_lookup[source]);
              }
              if (!should_source_succeed && !should_permission_succeed) {
                const expected_error_message = `${error_lookup[source]}\n${permission_failure_message}`;
                const sorted_actual_error_message = [...error.message].sort().join("");
                const sorted_expected_error_message = [...expected_error_message].sort().join("");
                expect(
                  sorted_actual_error_message,
                  makeExpectErrorMessage(expected_error_message, error.message)
                ).toBe(sorted_expected_error_message);
              }
            }
          }
        },
      }),
  });
}
