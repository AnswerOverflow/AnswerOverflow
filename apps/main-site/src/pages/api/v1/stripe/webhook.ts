import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { findServerByStripeCustomerId, updateServer } from '@answeroverflow/db';

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
export default async function webhookHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		const {
			headers: { 'stripe-signature': signature },
		} = requestValidation.parse(req);

		if (!process.env.STRIPE_SECRET_KEY) {
			throw new Error('stripe env variables are not set up');
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: '2022-11-15',
			typescript: true,
		});

		const event = stripe.webhooks.constructEvent(
			(await buffer(req)).toString(),
			signature,
			process.env.STRIPE_WEBHOOK_SECRET!,
		);

		const subscription = event.data.object as Stripe.Subscription;
		const existingServer = await findServerByStripeCustomerId(
			subscription.customer.toString(),
		);

		if (!existingServer) {
			console.error(
				'Server not found for stripe customer id',
				subscription.customer.toString(),
			);
			res.status(500).send('Server not found');
			return res.end();
		}

		console.log(
			`Incoming stripe event ${event.type} for server ${existingServer.id}`,
			subscription,
			event.type,
			existingServer.id,
		);
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				await updateServer({
					existing: existingServer,
					update: {
						stripeCustomerId: subscription.customer.toString(),
						stripeSubscriptionId: subscription.id,
						plan: 'PRO',
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
		return res.end();
	} catch (e) {
		const err = e as Error;
		console.error(err.message);
		res.status(500).send(err.message);
		return res.end();
	}
}
