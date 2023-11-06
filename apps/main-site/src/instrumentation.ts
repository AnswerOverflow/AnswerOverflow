export async function register() {
	// eslint-disable-next-line n/no-process-env
	if (process.env.NODE_ENV === 'development') {
		return;
	}
	// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { BaselimeSDK, VercelPlugin, BetterHttpInstrumentation } =
			await import('@baselime/node-opentelemetry');

		const sdk = new BaselimeSDK({
			serverless: true,
			service: 'main-site',
			instrumentations: [
				new BetterHttpInstrumentation({
					plugins: [
						// Add the Vercel plugin to enable correlation between your logs and traces for projects deployed on Vercel
						new VercelPlugin(),
					],
				}),
			],
		});

		sdk.start();
	}
}
