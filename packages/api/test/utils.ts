import type { DiscordAccount, Server } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { PermissionFlagsBits, PermissionResolvable, PermissionsBitField } from "discord.js";
import { Source, source_types, createContextInner } from "~api/router/context";
import {
  INVALID_ROUTE_FOR_BOT_ERROR,
  INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
  MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
} from "~api/utils/permissions";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
export async function mockAccountWithServersCallerCtx(
  server: Server,
  caller: Source,
  permissions: PermissionResolvable = PermissionsBitField.Default,
  override: Partial<DiscordAccount> = {}
) {
  const account = mockDiscordAccount(override);
  const ctx = await createCtxWithServers({
    user: account,
    permissions: permissions,
    server: server,
    caller: caller,
  });
  return { account, ctx };
}

export async function mockAccountCallerCtx(caller: Source, override: Partial<DiscordAccount> = {}) {
  const account = mockDiscordAccount(override);

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

export async function mockUnauthedCtx(caller: Source) {
  const ctx = await createContextInner({
    session: null,
    source: caller,
    discord_account: null,
    user_servers: undefined,
  });
  return ctx;
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
  // Possibly swap to Promise.All - going in parallel break things sometimes
  for await (const permission of Object.keys(PermissionFlagsBits)) {
    const permissionIsAllowed = permissionsThatShouldWork.includes(
      permission as PermissionResolvable
    );
    await operation(permission as PermissionResolvable, permissionIsAllowed);
  }
}

export type SourceVariantsTest = {
  sourcesThatShouldWork?: Source[];
  operation: (source: Source, should_source_succeed: boolean) => Promise<void> | void;
};

export async function testAllSources({
  sourcesThatShouldWork = [...source_types],
  operation,
}: SourceVariantsTest) {
  // Possibly swap to Promise.All - going in parallel break things sometimes
  for await (const source of source_types) {
    const sourceIsAllowed = sourcesThatShouldWork.includes(source);
    await operation(source, sourceIsAllowed);
  }
}

export type AllVaraintsTest = {
  sourcesThatShouldWork?: Source[];
  permissionsThatShouldWork?: PermissionResolvable[];
  operation: (
    source: Source,
    permission: PermissionResolvable,
    should_source_succeed: boolean,
    should_permission_succeed: boolean
  ) => Promise<void> | void;
};

export async function testAllVariants({
  sourcesThatShouldWork = [...source_types],
  permissionsThatShouldWork = Object.keys(PermissionFlagsBits) as PermissionResolvable[],
  operation,
}: AllVaraintsTest) {
  await testAllSources({
    sourcesThatShouldWork,
    operation: (source, should_source_succeed) =>
      testAllPermissions({
        permissionsThatShouldWork,
        operation: async (permission, should_permission_succeed) => {
          await operation(source, permission, should_source_succeed, should_permission_succeed);
        },
      }),
  });
}

export async function testAllDataVariants<F, T extends F>({
  permissionsThatShouldWork,
  sourcesThatShouldWork,
  fetch,
}: Omit<AllVaraintsTest, "operation"> & {
  fetch: (input: {
    source: Source;
    permission: PermissionResolvable;
    should_source_succeed: boolean;
    should_permission_succeed: boolean;
  }) => Promise<{
    data: T | F;
    public_data_format: F;
    private_data_format: T;
  }>;
}) {
  await testAllVariants({
    async operation(source, permission, should_source_succeed, should_permission_succeed) {
      try {
        const { data, public_data_format, private_data_format } = await fetch({
          source,
          permission,
          should_source_succeed,
          should_permission_succeed,
        });
        // TODO: Ugly
        if (should_source_succeed && should_permission_succeed) {
          if (Array.isArray(private_data_format)) {
            private_data_format.forEach((item) => {
              expect(
                data,
                `Failure from ${source} with ${permission as string} data did not match`
              ).toContainEqual(item);
            });
          } else {
            expect(
              data,
              `Failure from ${source} with ${permission as string} data did not match`
            ).toStrictEqual(private_data_format);
          }
        } else {
          if (Array.isArray(public_data_format)) {
            public_data_format.forEach((item) => {
              expect(
                data,
                `Failure from ${source} with ${permission as string} data did not match`
              ).toContainEqual(item);
            });
          } else {
            expect(
              data,
              `Failure from ${source} with ${permission as string} data did not match`
            ).toStrictEqual(public_data_format);
          }
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw new Error(
            `Error from ${source} with ${permission as string} \n \n \n ${error.name} \n ${
              error.code
            } \n ${error.message} \n  ${error.stack ?? ""}`
          );
        } else {
          throw error;
        }
      }
    },
    permissionsThatShouldWork,
    sourcesThatShouldWork,
  });
}

export async function testAllVariantsThatThrowErrors({
  sourcesThatShouldWork = [...source_types],
  permissionsThatShouldWork = Object.keys(PermissionFlagsBits) as PermissionResolvable[],
  operation,
  permission_failure_message = MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
}: Omit<AllVaraintsTest, "operation"> & {
  permission_failure_message?: string;
  operation: (input: {
    source: Source;
    permission: PermissionResolvable;
    should_source_succeed: boolean;
    should_permission_succeed: boolean;
  }) => Promise<void> | void;
}) {
  await testAllVariants({
    permissionsThatShouldWork,
    sourcesThatShouldWork,
    async operation(source, permission, should_source_succeed, should_permission_succeed) {
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
            expect(error.message, makeExpectErrorMessage(error_lookup[source], error.message)).toBe(
              error_lookup[source]
            );
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
        } else {
          throw error;
        }
      }
    },
  });
}
