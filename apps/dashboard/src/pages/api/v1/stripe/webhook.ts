import { Readable } from 'node:stream';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { z } from 'zod';

import { Plan } from '@answeroverflow/core/schema';
import {
	findServerByStripeCustomerId,
	findServerByStripeSubscriptionId,
	updateServer,
} from '@answeroverflow/core/server';
import { sharedEnvs } from '@answeroverflow/env/shared';

// Stripe requires the raw body to construct the event.
export const config = {
	api: {
		bodyParser: false,
	},
};

async function buffer(readable: Readable) {
	const chunks = [];
	for await (const chunk of readable) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	return Buffer.concat(chunks);
}

const requestValidation = z.object({
	method: z.literal('POST'),
	headers: z.object({
		'stripe-signature': z.string(),
	}),
});

const allowedEvents = new Set([
	'customer.subscription.created',
	'customer.subscription.updated',
	'customer.subscription.deleted',
]);
export default async function webhookHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		const {
			headers: { 'stripe-signature': signature },
		} = requestValidation.parse(req);
		if (!sharedEnvs.STRIPE_WEBHOOK_SECRET || !sharedEnvs.STRIPE_SECRET_KEY) {
			throw new Error('Stripe env vars not set');
		}
		const stripe = new Stripe(sharedEnvs.STRIPE_SECRET_KEY, {
			apiVersion: '2022-11-15',
			typescript: true,
		});

		const event = stripe.webhooks.constructEvent(
			(await buffer(req)).toString(),
			signature,
			sharedEnvs.STRIPE_WEBHOOK_SECRET,
		);

		if (!allowedEvents.has(event.type)) {
			throw new Error(`Unexpected event type ${event.type}`);
		}

		const subscription = event.data.object as Stripe.Subscription;
		const customerId =
			typeof subscription.customer === 'string'
				? subscription.customer
				: subscription.customer.id;
		let existingServer = await findServerByStripeCustomerId(customerId);
		if (!existingServer) {
			existingServer = await findServerByStripeSubscriptionId(subscription.id);
		}

		if (!existingServer) {
			console.error(
				'Server not found for stripe customer id',
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				subscription.customer.toString(),
			);
			res.status(500).send('Server not found');
			res.end();
			return;
		}

		console.log(
			`Incoming stripe event ${event.type} for server ${existingServer.id}`,
		);
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscriptionPlanId = subscription.items.data[0]?.plan.id;
				if (!subscriptionPlanId) {
					throw new Error('subscription level not found');
				}
				let plan: Plan;
				switch (subscriptionPlanId) {
					case sharedEnvs.STRIPE_ENTERPRISE_PLAN_LEGACY_PRICE_ID:
						plan = 'ENTERPRISE';
						break;
					case sharedEnvs.STRIPE_PRO_PLAN_LEGACY_PRICE_ID:
						plan = 'PRO';
						break;
					case sharedEnvs.STRIPE_STARTER_PLAN_PRICE_ID:
						plan = 'STARTER';
						break;
					case sharedEnvs.STRIPE_ADVANCED_PLAN_PRICE_ID: {
						plan = 'ADVANCED';
						break;
					}
					default:
						throw new Error(`Unknown subscription level ${subscriptionPlanId}`);
				}
				await updateServer({
					existing: existingServer,
					update: {
						stripeCustomerId: customerId,
						stripeSubscriptionId: subscription.id,
						plan,
						id: existingServer.id,
					},
				});
				break;
			}

			case 'customer.subscription.deleted': {
				console.log('subscription deleted', subscription);

				await updateServer({
					existing: existingServer,
					update: {
						// eslint-disable-next-line @typescript-eslint/no-base-to-string
						stripeCustomerId: subscription.customer.toString(),
						stripeSubscriptionId: null,
						plan: 'FREE',
						id: existingServer.id,
					},
				});
				break;
			}
			default:
				console.error(
					'Incoming stripe event, that should not be received',
					event.type,
				);
				break;
		}
		res.send('OK');
		res.end();
		return;
	} catch (e) {
		const err = e as Error;
		console.error(err.message);
		res.status(500).send(err.message);
		res.end();
		return;
	}
}
