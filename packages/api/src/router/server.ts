import {
	findServerByAliasOrId,
	findServerById,
	updateServer,
	upsertServer,
} from '@answeroverflow/core/server';
import { getDefaultServerWithFlags } from '@answeroverflow/core/utils/serverUtils';
import { ServerWithFlags, zServerCreate } from '@answeroverflow/core/zod';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { botClient } from '../bot/caller';
import {
	DomainVerificationStatusProps,
	addDomainToVercel,
	getConfigResponse,
	getDomainResponse,
	removeDomainFromVercelProject,
	verifyDomain,
} from '../utils/domains';
import {
	assertBoolsAreNotEqual,
	assertCanEditServer,
	assertCanEditServerBotOnly,
	assertIsAdminOrOwnerOfServer,
	assertIsOnPlan,
} from '../utils/permissions';
import {
	protectedFetch,
	protectedMutation,
	protectedMutationFetchFirst,
} from '../utils/protected-procedures';
import { Context } from './context';
import { router, withUserServersProcedure } from './trpc';

export const READ_THE_RULES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE =
	'Read the rules consent already enabled';
export const READ_THE_RULES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE =
	'Read the rules consent already disabled';
export const DISABLE_CONSENT_TO_DISPLAY_MESSAGES_ALREADY_ENABLED_ERROR_MESSAGE =
	'Disable consent to display messages already enabled';
export const DISABLE_CONSENT_TO_DISPLAY_MESSAGES_ALREADY_DISABLED_ERROR_MESSAGE =
	'Disable consent to display messages already disabled';
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
				fetch: () => {
					return findServerByAliasOrId(input);
				},
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
	setConsiderAllMessagesPublic: withUserServersProcedure
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
								oldValue: oldSettings.flags.considerAllMessagesPublic,
								newValue: input.enabled,
								messageIfBothFalse:
									DISABLE_CONSENT_TO_DISPLAY_MESSAGES_ALREADY_DISABLED_ERROR_MESSAGE,
								messageIfBothTrue:
									DISABLE_CONSENT_TO_DISPLAY_MESSAGES_ALREADY_ENABLED_ERROR_MESSAGE,
							}),
						operation: () =>
							upsertServer({
								create: {
									...input.server,
									flags: {
										considerAllMessagesPublic: input.enabled,
									},
								},
								update: {
									flags: {
										considerAllMessagesPublic: input.enabled,
									},
								},
							}),
					});
				},
			});
		}),
	setAnonymizeMessages: withUserServersProcedure
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
								oldValue: oldSettings.flags.anonymizeMessages,
								newValue: input.enabled,
								messageIfBothFalse: 'Anonymize messages already disabled',
								messageIfBothTrue: 'Anonymize messages already enabled',
							}),
						operation: () =>
							upsertServer({
								create: {
									...input.server,
									flags: {
										anonymizeMessages: input.enabled,
									},
								},
								update: {
									flags: {
										anonymizeMessages: input.enabled,
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
		.mutation(async ({ input, ctx }) =>
			protectedMutationFetchFirst({
				async operation() {
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

						if (newCustomDomain.toLowerCase().endsWith('.answeroverflow.com')) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message:
									'Domain cannot end with .answeroverflow.com. Please use a domain that you own',
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
						if (
							'code' in error &&
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							error.code === 'P2002'
						) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: `Domain ${newCustomDomain} already in use`,
							});
						} else {
							throw new TRPCError({
								code: 'INTERNAL_SERVER_ERROR',
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
								message: 'message' in error ? error.message : 'Unknown error',
							});
						}
					}
				},
				fetch: () => findServerById(input.serverId),
				notFoundMessage: 'Server not found',
				permissions: [
					() => assertIsAdminOrOwnerOfServer(ctx, input.serverId),
					(server) =>
						assertIsOnPlan(server, ['PRO', 'OPEN_SOURCE', 'ENTERPRISE']),
				],
			}),
		),
	verifyCustomDomain: withUserServersProcedure
		.input(z.string())
		.query(async ({ input }) => {
			const domain = input;
			let status: DomainVerificationStatusProps = 'Valid Configuration';

			const [domainJson, configJson] = await Promise.all([
				getDomainResponse(domain),
				getConfigResponse({ domain }),
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
	callBot: withUserServersProcedure.query(async () => {
		return botClient.hello.query();
	}),
});
