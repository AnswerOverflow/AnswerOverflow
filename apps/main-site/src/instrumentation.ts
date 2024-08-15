import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { registerOTel } from '@vercel/otel';
import { sharedEnvs } from '@answeroverflow/env/shared';

export function register() {
	if (sharedEnvs.NODE_ENV === 'production') {
		registerOTel({
			serviceName: 'main-site',
			spanProcessors: [
				new SimpleSpanProcessor(
					new OTLPTraceExporter({
						url: 'https://api.axiom.co/v1/traces',
						headers: {
							Authorization: `Bearer ${sharedEnvs.AXIOM_API_KEY}`,
							'X-Axiom-Dataset': 'main-site-otl',
						},
					}),
				),
			],
		});
	}
}
