import {
	zServerPublic,
	findServerById,
	type ServerWithFlags,
	getDefaultServerWithFlags,
	upsertServer,
	zServerCreate,
	findServerByAliasOrId,
	findAllServers,
} from '@answeroverflow/db';
import { z } from 'zod';
import type { Context } from '~api/router/context';
import {
	publicProcedure,
	router,
	withUserServersProcedure,
} from '~api/router/trpc';
import { findOrThrowNotFound } from '~api/utils/operations';
import {
	assertBoolsAreNotEqual,
	assertCanEditServer,
	assertCanEditServerBotOnly,
} from '~api/utils/permissions';
import {
	protectedMutation,
	protectedFetch,
} from '~api/utils/protected-procedures';

export const READ_THE_RULES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE =
	'Read the rules consent already enabled';
export const READ_THE_RULES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE =
	'Read the rules consent already disabled';

async function mutateServer({
	operation,
	server,
	ctx,
}: {
	operation: (input: {
		oldSettings: ServerWithFlags;
		doSettingsExistAlready: boolean;
	}) => Promise<ServerWithFlags>;
	server: z.infer<typeof zServerCreate>;
	ctx: Context;
}) {
	return protectedMutation({
		permissions: () => assertCanEditServerBotOnly(ctx, server.id),
		operation: async () => {
			let oldSettings = await findServerById(server.id);
			let doSettingsExistAlready = true;
			if (!oldSettings) {
				oldSettings = getDefaultServerWithFlags({
					id: server.id,
					name: server.name,
					icon: server.icon,
				});
				doSettingsExistAlready = false;
			} else {
				doSettingsExistAlready = true;
			}
			return operation({ oldSettings, doSettingsExistAlready });
		},
	});
}

export const serverRouter = router({
	byId: withUserServersProcedure.input(z.string()).query(({ ctx, input }) => {
		return protectedFetch({
			fetch: () => findServerByAliasOrId(input),
			permissions: () => assertCanEditServer(ctx, input),
			notFoundMessage: 'Server not found',
		});
	}),
	byIdPublic: publicProcedure.input(z.string()).query(async ({ input }) => {
		const data = await findOrThrowNotFound(
			() => findServerByAliasOrId(input),
			'Server not found',
		);
		return zServerPublic.parse(data);
	}),
	getAllServers: publicProcedure.query(async () => {
		const data = await findOrThrowNotFound(
			() => findAllServers(),
			'No servers found',
		);
		return zServerPublic.parse(data);
	}),
	setReadTheRulesConsentEnabled: withUserServersProcedure
		.input(
			z.object({
				server: zServerCreate.omit({
					flags: true,
				}),
				enabled: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return mutateServer({
				ctx,
				server: input.server,
				operation: async ({ oldSettings }) => {
					return protectedMutation({
						permissions: () =>
							assertBoolsAreNotEqual({
								oldValue: oldSettings.flags.readTheRulesConsentEnabled,
								newValue: input.enabled,
								messageIfBothFalse:
									READ_THE_RULES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE,
								messageIfBothTrue:
									READ_THE_RULES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE,
							}),
						operation: () =>
							upsertServer({
								create: {
									...input.server,
									flags: {
										readTheRulesConsentEnabled: input.enabled,
									},
								},
								update: {
									flags: {
										readTheRulesConsentEnabled: input.enabled,
									},
								},
							}),
					});
				},
			});
		}),
});
