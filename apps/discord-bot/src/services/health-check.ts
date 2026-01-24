import { createServer } from "node:http";
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";

const PORT = Number(process.env.PORT) || 8080;

const makeHealthCheckRouter = Effect.gen(function* () {
	return HttpRouter.empty.pipe(
		HttpRouter.get(
			"/health",
			Effect.gen(function* () {
				return yield* HttpServerResponse.json({
					status: "healthy",
					timestamp: new Date().toISOString(),
				});
			}).pipe(
				Effect.catchAll((error) =>
					HttpServerResponse.json(
						{
							status: "unhealthy",
							timestamp: new Date().toISOString(),
							error: error instanceof Error ? error.message : "Unknown error",
						},
						{ status: 503 },
					),
				),
			),
		),
	);
});

const HealthCheckServerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const router = yield* makeHealthCheckRouter;
		const app = router.pipe(HttpServer.serve());

		yield* Console.log(`Health check server starting on port ${PORT}`);

		yield* Layer.launch(
			Layer.provide(
				app,
				NodeHttpServer.layer(() => createServer(), { port: PORT }),
			),
		);

		yield* Console.log(`Health check server listening on port ${PORT}`);
	}),
);

export const HealthCheckHandlerLayer = HealthCheckServerLayer;
