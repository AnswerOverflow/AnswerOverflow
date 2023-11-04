import { registerOTel } from '@vercel/otel';
import { sharedEnvs } from '@answeroverflow/env/shared';

export function register() {
	registerOTel('main-site', 'https://api.axiom.co/v1/traces', {
		Authorization: `Bearer ${sharedEnvs.AXIOM_API_KEY}`,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		'X-Axiom-Dataset': sharedEnvs.AXIOM_OTL_DATASET!,
	});
}
