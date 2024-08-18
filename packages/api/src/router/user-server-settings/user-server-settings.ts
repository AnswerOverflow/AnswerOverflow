import {
	findServerById,
	findUserServerSettingsById,
	getDefaultUserServerSettingsWithFlags,
	upsertUserServerSettingsWithDeps,
	type UserServerSettingsWithFlags,
	zUserServerSettingsCreateWithDeps,
	zUserServerSettingsFlags,
} from '@answeroverflow/db';
import {
	withDiscordAccountProcedure,
	router,
	withUserServersProcedure,
} from '../trpc';

import { z } from 'zod';
import {
	MANAGE_ACCOUNT_SOURCES,
	CONSENT_SOURCES,
	CONSENT_ALREADY_DENIED_MESSAGE,
	CONSENT_EXPLICITLY_SET_MESSAGE,
	CONSENT_ALREADY_GRANTED_MESSAGE,
	MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE,
	MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE,
	CONSENT_PREVENTED_BY_DISABLED_INDEXING_MESSAGE,
	AUTOMATED_CONSENT_SOURCES,
} from './types';
import type { Context } from '../context';
export const SERVER_NOT_SETUP_MESSAGE =
	'Server is not setup for Answer Overflow yet';
import crypto from 'crypto';
import { findOrThrowNotFound } from '../../utils/operations';
import {
	assertIsUser,
	assertIsOnPlan,
	assertIsAdminOrOwnerOfServer,
	assertBoolsAreNotEqual,
	assertIsNotValue,
} from '../../utils/permissions';
import {
	protectedMutation,
	protectedMutationFetchFirst,
} from '../../utils/protected-procedures';

async function mutateUserServerSettings({
	operation,
	find,
	ctx,
}: {
	operation: (input: {
		oldSettings: UserServerSettingsWithFlags;
		doSettingsExistAlready: boolean;
	}) => Promise<UserServerSettingsWithFlags>;
	find: {
		userId: string;
		serverId: string;
	};
	ctx: Context;
}) {
	return protectedMutation({
		permissions: () => assertIsUser(ctx, find.userId),
		operation: async () => {
			let oldSettings = await findUserServerSettingsById(find);
			let doSettingsExistAlready = true;
			if (!oldSettings) {
				oldSettings = getDefaultUserServerSettingsWithFlags(find);
				doSettingsExistAlready = false;
			} else {
				doSettingsExistAlready = true;
			}
			return operation({ oldSettings, doSettingsExistAlready });
		},
	});
}

const userServerSettingsCrudRouter = router({
	byId: withDiscordAccountProcedure
		.input(z.string())
		.query(async ({ input, ctx }) => {
			const userId = ctx.discordAccount?.id;
			return findOrThrowNotFound(
				() =>
					userId
						? findUserServerSettingsById({
								userId,
								serverId: input,
							})
						: undefined,
				'Server settings not found',
			);
		}),
	refreshApiKey: withUserServersProcedure
		.input(z.string())
		.mutation(async ({ input, ctx }) => {
			const discordAccount = ctx.discordAccount;
			if (!discordAccount) {
				throw new Error('Discord account not found');
			}
			return protectedMutationFetchFirst({
				fetch() {
					return findServerById(input);
				},
				permissions: [
					(server) => assertIsOnPlan(server, ['PRO', 'ENTERPRISE']),
					() => assertIsAdminOrOwnerOfServer(ctx, input),
				],
				notFoundMessage: SERVER_NOT_SETUP_MESSAGE,
				async operation() {
					const newApiKey = crypto.randomBytes(32).toString('hex');
					return upsertUserServerSettingsWithDeps({
						serverId: input,
						user: {
							...discordAccount,
							avatar: discordAccount.avatar ?? null,
							name: discordAccount.username,
						},
						apiKey: newApiKey,
					});
				},
			});
		}),
	setIndexingDisabled: withDiscordAccountProcedure
		.input(
			z.object({
				source: z.enum(MANAGE_ACCOUNT_SOURCES),
				// @ts-ignore
				data: zUserServerSettingsCreateWithDeps
					.pick({
						serverId: true,
						user: true,
					})
					.extend({
						flags: zUserServerSettingsFlags.pick({
							messageIndexingDisabled: true,
						}),
					}),
			}),
		)
		.mutation(({ input, ctx }) => {
			return mutateUserServerSettings({
				ctx,
				find: { userId: input.data.user.id, serverId: input.data.serverId },
				operation: ({ oldSettings: existingSettings }) =>
					protectedMutation({
						permissions: () =>
							assertBoolsAreNotEqual({
								messageIfBothFalse: MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE,
								messageIfBothTrue: MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE,
								newValue: input.data.flags.messageIndexingDisabled,
								oldValue: existingSettings.flags.messageIndexingDisabled,
							}),
						operation: () => upsertUserServerSettingsWithDeps(input.data),
					}),
			});
		}),
	setConsentGranted: withDiscordAccountProcedure
		.input(
			z.object({
				source: z.enum(CONSENT_SOURCES),
				// @ts-ignore
				data: zUserServerSettingsCreateWithDeps
					.pick({
						serverId: true,
						user: true,
					})
					.extend({
						flags: zUserServerSettingsFlags.pick({
							canPubliclyDisplayMessages: true,
						}),
					}),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const isAutomatedConsent = AUTOMATED_CONSENT_SOURCES.includes(
				input.source,
			);
			return mutateUserServerSettings({
				ctx,
				find: { userId: input.data.user.id, serverId: input.data.serverId },
				operation: ({ oldSettings, doSettingsExistAlready }) =>
					protectedMutation({
						permissions: [
							() =>
								input.data.flags.canPubliclyDisplayMessages
									? assertIsNotValue({
											actualValue: oldSettings.flags.messageIndexingDisabled,
											expectedToNotBeValue: true,
											errorMessage:
												CONSENT_PREVENTED_BY_DISABLED_INDEXING_MESSAGE,
										})
									: undefined,
							() =>
								isAutomatedConsent
									? assertIsNotValue({
											actualValue: doSettingsExistAlready,
											expectedToNotBeValue: true,
											errorMessage: CONSENT_EXPLICITLY_SET_MESSAGE,
										})
									: assertBoolsAreNotEqual({
											messageIfBothFalse: CONSENT_ALREADY_DENIED_MESSAGE,
											messageIfBothTrue: CONSENT_ALREADY_GRANTED_MESSAGE,
											newValue: input.data.flags.canPubliclyDisplayMessages,
											oldValue: oldSettings.flags.canPubliclyDisplayMessages,
										}),
						],
						operation: () => upsertUserServerSettingsWithDeps(input.data),
					}),
			});
		}),
});

export const userServerSettingsRouter = userServerSettingsCrudRouter;
