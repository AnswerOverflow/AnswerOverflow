import type { DiscordAccount, Server } from '@answeroverflow/db';
import { TRPCError } from '@trpc/server';
import {
	type Source,
	sourceTypes,
	createContextInner,
} from '~api/router/context';
import {
	INVALID_ROUTE_FOR_BOT_ERROR,
	INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
	MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
} from '~api/utils/permissions';
import { mockDiscordAccount } from '@answeroverflow/db-mock';
import { PermissionResolvable, PermissionsBitField } from '~api/utils/types';
import { PermissionFlagsBits } from 'discord-api-types/v10';
export async function mockAccountWithServersCallerCtx(
	server: Server,
	caller: Source,
	permissions: PermissionResolvable = [],
	override: Partial<DiscordAccount> = {},
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

export async function mockAccountCallerCtx(
	caller: Source,
	override: Partial<DiscordAccount> = {},
) {
	const account = mockDiscordAccount(override);

	const ctx = await createContextInner({
		session: null,
		source: caller,
		discordAccount: {
			id: account.id,
			avatar: null,
			username: account.name,
			discriminator: '0000',
		},
		userServers: undefined,
	});
	return { account, ctx };
}

export async function mockUnauthedCtx(caller: Source) {
	const ctx = await createContextInner({
		session: null,
		source: caller,
		discordAccount: null,
		userServers: undefined,
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
	const num = PermissionsBitField.resolve(input.permissions);
	return createContextInner({
		session: null,
		source: input.caller,
		discordAccount: {
			id: input.user.id,
			avatar: null,
			username: input.user.name,
			discriminator: '0000',
		},
		userServers: [
			{
				features: [],
				id: input.server.id,
				name: input.server.name,
				owner: false,
				icon: null,
				permissions: Number(num),
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
		isPermissionAllowed: boolean,
	) => Promise<void> | void;
};

export async function testAllPermissions({
	permissionsThatShouldWork,
	operation,
}: PermissionVariantsTest) {
	// Possibly swap to Promise.All - going in parallel break things sometimes
	for await (const permission of Object.keys(PermissionFlagsBits)) {
		const permissionIsAllowed = permissionsThatShouldWork.includes(
			permission as PermissionResolvable,
		);
		await operation(permission as PermissionResolvable, permissionIsAllowed);
	}
}

export type SourceVariantsTest = {
	sourcesThatShouldWork?: Source[];
	operation: (
		source: Source,
		shouldSourceSucceed: boolean,
	) => Promise<void> | void;
};

export async function testAllSources({
	sourcesThatShouldWork = [...sourceTypes],
	operation,
}: SourceVariantsTest) {
	// Possibly swap to Promise.All - going in parallel break things sometimes
	for await (const source of sourceTypes) {
		const sourceIsAllowed = sourcesThatShouldWork.includes(source);
		await operation(source, sourceIsAllowed);
	}
}

export type AllVariantsTest = {
	sourcesThatShouldWork?: Source[];
	permissionsThatShouldWork?: PermissionResolvable[];
	operation: (
		source: Source,
		permission: PermissionResolvable,
		shouldSourceSucceed: boolean,
		shouldPermissionSucceed: boolean,
	) => Promise<void> | void;
};

export async function testAllSourceAndPermissionVariants({
	sourcesThatShouldWork = [...sourceTypes],
	permissionsThatShouldWork = Object.keys(
		PermissionFlagsBits,
	) as PermissionResolvable[],
	operation,
}: AllVariantsTest) {
	await testAllSources({
		sourcesThatShouldWork,
		operation: (source, shouldSourceSucceed) =>
			testAllPermissions({
				permissionsThatShouldWork,
				operation: async (permission, shouldPermissionSucceed) => {
					await operation(
						source,
						permission,
						shouldSourceSucceed,
						shouldPermissionSucceed,
					);
				},
			}),
	});
}

export async function testAllPublicAndPrivateDataVariants<F, T extends F>({
	permissionsThatShouldWork,
	sourcesThatShouldWork,
	fetch,
}: Omit<AllVariantsTest, 'operation'> & {
	fetch: (input: {
		source: Source;
		permission: PermissionResolvable;
		shouldSourceSucceed: boolean;
		shouldPermissionSucceed: boolean;
	}) => Promise<{
		data: T | F;
		publicDataFormat: F;
		privateDataFormat: T;
	}>;
}) {
	await testAllSourceAndPermissionVariants({
		async operation(
			source,
			permission,
			shouldSourceSucceed,
			shouldPermissionSucceed,
		) {
			try {
				const { data, publicDataFormat, privateDataFormat } = await fetch({
					source,
					permission,
					shouldSourceSucceed,
					shouldPermissionSucceed,
				});
				// TODO: Ugly
				if (shouldSourceSucceed && shouldPermissionSucceed) {
					if (Array.isArray(privateDataFormat)) {
						privateDataFormat.forEach((item) => {
							expect(
								data,
								`Failure from ${source} with ${
									permission as string
								} data did not match`,
							).toContainEqual(item);
						});
					} else {
						expect(
							data,
							`Failure from ${source} with ${
								permission as string
							} data did not match`,
						).toEqual(privateDataFormat);
					}
				} else {
					if (Array.isArray(publicDataFormat)) {
						publicDataFormat.forEach((item) => {
							expect(
								data,
								`Failure from ${source} with ${
									permission as string
								} data did not match`,
							).toContainEqual(item);
						});
					} else {
						expect(
							data,
							`Failure from ${source} with ${
								permission as string
							} data did not match`,
						).toEqual(publicDataFormat);
					}
				}
			} catch (error) {
				if (error instanceof TRPCError) {
					throw new Error(
						`Error from ${source} with ${permission as string} \n \n \n ${
							error.name
						} \n ${error.code} \n ${error.message} \n  ${error.stack ?? ''}`,
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

export async function testAllVariants<T>({
	arr,
	operation,
}: {
	arr: T[];
	operation: (item: T) => Promise<void> | void;
}) {
	await Promise.all(arr.map((item) => operation(item)));
}

export async function testAllSourceAndPermissionVariantsThatThrowErrors({
	sourcesThatShouldWork = [...sourceTypes],
	permissionsThatShouldWork = Object.keys(
		PermissionFlagsBits,
	) as PermissionResolvable[],
	operation,
	permissionFailureMessage = MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
}: Omit<AllVariantsTest, 'operation'> & {
	permissionFailureMessage?: string;
	operation: (input: {
		source: Source;
		permission: PermissionResolvable;
		shouldSourceSucceed: boolean;
		shouldPermissionSucceed: boolean;
	}) => Promise<void> | void;
}) {
	await testAllSourceAndPermissionVariants({
		permissionsThatShouldWork,
		sourcesThatShouldWork,
		async operation(
			source,
			permission,
			shouldSourceSucceed,
			shouldPermissionSucceed,
		) {
			try {
				await operation({
					source,
					permission,
					shouldSourceSucceed,
					shouldPermissionSucceed,
				});
				expect(shouldPermissionSucceed).toBeTruthy();
				expect(shouldSourceSucceed).toBeTruthy();
			} catch (error) {
				const errorLookup: Record<Source, string> = {
					'discord-bot': INVALID_ROUTE_FOR_BOT_ERROR,
					'web-client': INVALID_ROUTER_FOR_WEB_CLIENT_ERROR,
				};
				if (error instanceof TRPCError) {
					if (shouldSourceSucceed && shouldPermissionSucceed) {
						throw error;
					}
					const makeExpectErrorMessage = (
						expectedMessage: string,
						actualMessage: string,
					) =>
						`Failure from ${source} with permissions ${permission.toString()}.\nExpected message:\n-----\n${expectedMessage}\n-----\n\n\nActual Message:\n\n-----\n${actualMessage}\n-----\n\n`;

					if (!shouldPermissionSucceed && shouldSourceSucceed) {
						expect(
							error.message,
							makeExpectErrorMessage(permissionFailureMessage, error.message),
						).toBe(permissionFailureMessage);
					}
					if (!shouldSourceSucceed && shouldPermissionSucceed) {
						expect(
							error.message,
							makeExpectErrorMessage(errorLookup[source], error.message),
						).toBe(errorLookup[source]);
					}
					if (!shouldSourceSucceed && !shouldPermissionSucceed) {
						const expectedErrorMessage = `${errorLookup[source]}\n${permissionFailureMessage}`;
						const sortedActualErrorMessage = [...error.message].sort().join('');
						const sortedExpectedErrorMessage = [...expectedErrorMessage]
							.sort()
							.join('');
						expect(
							sortedActualErrorMessage,
							makeExpectErrorMessage(expectedErrorMessage, error.message),
						).toBe(sortedExpectedErrorMessage);
					}
				} else {
					throw error;
				}
			}
		},
	});
}
