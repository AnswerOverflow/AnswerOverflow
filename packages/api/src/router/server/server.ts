import {
	findServerById,
	type ServerWithFlags,
	getDefaultServerWithFlags,
	upsertServer,
	zServerCreate,
	findServerByAliasOrId,
	updateServer,
} from '@answeroverflow/db';
import { TRPCError } from '@trpc/server';
import Stripe from 'stripe';
import { z } from 'zod';
import type { Context } from '~api/router/context';
import { router, withUserServersProcedure } from '~api/router/trpc';
import {
	addDomainToVercel,
	DomainVerificationStatusProps,
	getConfigResponse,
	getDomainResponse,
	removeDomainFromVercelProject,
	verifyDomain,
} from '~api/utils/domains';
import {
	assertBoolsAreNotEqual,
	assertCanEditServer,
	assertCanEditServerBotOnly,
	assertIsAdminOrOwnerOfServer,
	assertIsOnPlan,
} from '~api/utils/permissions';
import {
	protectedMutation,
	protectedFetch,
	protectedMutationFetchFirst,
} from '~api/utils/protected-procedures';
import { fetchServerPageViewsAsLineChart } from '~api/utils/posthog';

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
					(server) => assertIsOnPlan(server, ['PRO', 'OPEN_SOURCE']),
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
	fetchDashboardById: withUserServersProcedure
		.input(z.string())
		.query(async ({ input, ctx }) =>
			protectedFetch({
				fetch: async () => {
					const server = await findServerById(input);
					if (!server) {
						throw new TRPCError({
							code: 'NOT_FOUND',
							message: 'Server not found',
						});
					}

					const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
						apiVersion: '2022-11-15',
						typescript: true,
					});

					// If they have a subscription already, we display the portal
					if (server.stripeCustomerId && server.stripeSubscriptionId) {
						const [session, sub] = await Promise.all([
							stripe.billingPortal.sessions.create({
								customer: server.stripeCustomerId,
							}),
							stripe.subscriptions.retrieve(server.stripeSubscriptionId),
						]);
						const {
							cancel_at: cancelAt, // This is when a cancellation will take effect
							current_period_end: currentPeriodEnd, // This is when an active subscription will renew
							trial_end: trialEnd, // This is when a trial will end
							// get when subscription will renew
						} = sub;
						return {
							...server,
							stripeCheckoutUrl: session.url,
							dateCancelationTakesEffect: cancelAt,
							dateSubscriptionRenews: currentPeriodEnd,
							dateTrialEnds: trialEnd,
						};
					}

					// else we upsert them and then display checkout

					if (!server.stripeCustomerId) {
						const customer = await stripe.customers.create({
							name: server.name,
						});
						server.stripeCustomerId = customer.id;
						await updateServer({
							existing: server,
							update: {
								id: server.id,
								stripeCustomerId: customer.id,
							},
						});
					}
					// const returnUrl = `${getBaseUrl()}/dashboard/${server.id}`;

					// const session = await stripe.checkout.sessions.create({
					// 	billing_address_collection: 'auto',
					// 	line_items: [
					// 		{
					// 			// base
					// 			price: process.env.STRIPE_PRO_PLAN_PRICE_ID,
					// 			quantity: 1,
					// 		},
					// 		{
					// 			// additional page views
					// 			price: process.env.STRIPE_PAGE_VIEWS_PRICE_ID,
					// 		},
					// 	],
					// 	mode: 'subscription',
					// 	subscription_data: {
					// 		trial_period_days: 14,
					// 	},
					// 	success_url: returnUrl,
					// 	cancel_url: returnUrl,
					// 	currency: 'USD',
					// 	allow_promotion_codes: true,
					// 	customer: server.stripeCustomerId,
					// });
					return {
						...server,
						stripeCheckoutUrl: null,
						dateCancelationTakesEffect: null,
						dateSubscriptionRenews: null,
						dateTrialEnds: null,
					};
				},
				notFoundMessage: 'Server not found',
				permissions: () => assertCanEditServer(ctx, input),
			}),
		),
	fetchPageViewsAsLineChart: withUserServersProcedure
		.input(z.string())
		.query(({ input, ctx }) => {
			return protectedFetch({
				fetch: () => fetchServerPageViewsAsLineChart(input),
				notFoundMessage: 'Server not found',
				permissions: () => assertCanEditServer(ctx, input),
			});
		}),
});
