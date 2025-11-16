import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { checkBotId } from "botid/server";
import { Effect, Layer } from "effect";
import type { Context } from "hono";
import { signAnonymousToken } from "@/lib/anonymous-auth";

const OtelLayer = createOtelLayer("main-site");

export async function handleAnonymousSession(c: Context) {
	const verification = await checkBotId({
		developmentOptions: {
			bypass: process.env.NODE_ENV === "development" ? "HUMAN" : undefined,
		},
	});
	if (!verification.isHuman) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const session = await Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.anonymous_session.createAnonymousSession();
	}).pipe(
		Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)),
		Effect.runPromise,
	);

	const token = await signAnonymousToken(session.sessionId);

	return c.json({
		token,
		sessionId: session.sessionId,
		expiresAt: session.expiresAt,
	});
}
