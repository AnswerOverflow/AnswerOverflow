import {
	zServerPublic,
	findServerById,
	type ServerWithFlags,
	getDefaultServerWithFlags,
	upsertServer,
	zServerCreate,
	findServerByAliasOrId,
	updateServer,
} from '@answeroverflow/db';
import { TRPCError } from '@trpc/server';
import { custom, z } from 'zod';
import type { Context } from '~api/router/context';
import {
	publicProcedure,
	router,
	withUserServersProcedure,
} from '~api/router/trpc';
import {
	addDomainToVercel,
	getConfigResponse,
	getDomainResponse,
	removeDomainFromVercelProject,
	verifyDomain,
} from '~api/utils/domains';
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
import { DomainVerificationStatusProps } from '~api/utils/types';

export const READ_THE_RULES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE =
	'Read the rules consent already enabled';
export const READ_THE_RULES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE =
	'Read the rules consent already disabled';
export const validDomainRegex = new RegExp(
	/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
);

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
	byId: withUserServersProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: () => findServerByAliasOrId(input),
				permissions: () => assertCanEditServer(ctx, input),
				notFoundMessage: 'Server not found',
			});
			if (data.kickedTime) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Server not found',
				});
			}
			return data;
		}),
	byIdPublic: publicProcedure.input(z.string()).query(async ({ input }) => {
		const data = await findOrThrowNotFound(
			() => findServerByAliasOrId(input),
			'Server not found',
		);
		if (data.kickedTime) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Server not found',
			});
		}

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
	setCustomDomain: withUserServersProcedure
		.input(
			z.object({
				serverId: z.string(),
				customDomain: z.string(), // TODO: Could validate regex here
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { serverId, customDomain: newCustomDomain } = input;
			try {
				const oldServerInfo = await findServerById(serverId);
				if (!oldServerInfo) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Server not found',
					});
				}

				const isValidDomain =
					validDomainRegex.test(newCustomDomain) || newCustomDomain === '';
				if (!isValidDomain) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Invalid domain',
					});
				}

				const response = await updateServer({
					existing: oldServerInfo,
					update: {
						customDomain: newCustomDomain === '' ? null : newCustomDomain,
						id: serverId,
					},
				});
				await addDomainToVercel(newCustomDomain);

				// if the site had a different customDomain before, we need to remove it from Vercel
				if (
					oldServerInfo.customDomain &&
					oldServerInfo.customDomain !== newCustomDomain
				) {
					await removeDomainFromVercelProject(oldServerInfo.customDomain);
				}

				// TODO: Update cache?

				return response;
			} catch (error: any) {
				if (error.code === 'P2002') {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: `Domain ${newCustomDomain} already in use`,
					});
				} else {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: error.message,
					});
				}
			}
		}),
	verifyCustomDomain: withUserServersProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			const domain = input;
			let status: DomainVerificationStatusProps = 'Valid Configuration';

			const [domainJson, configJson] = await Promise.all([
				getDomainResponse(domain),
				getConfigResponse(domain),
			]);

			if (domainJson?.error?.code === 'not_found') {
				// domain not found on Vercel project
				status = 'Domain Not Found';

				// unknown error
			} else if (domainJson.error) {
				status = 'Unknown Error';

				// if domain is not verified, we try to verify now
			} else if (!domainJson.verified) {
				status = 'Pending Verification';
				const verificationJson = await verifyDomain(domain);

				// domain was just verified
				if (verificationJson && verificationJson.verified) {
					status = 'Valid Configuration';
				}
			} else if (configJson.misconfigured) {
				status = 'Invalid Configuration';
			} else {
				status = 'Valid Configuration';
			}
			return {
				status,
				domainJson,
			};
		}),
});
