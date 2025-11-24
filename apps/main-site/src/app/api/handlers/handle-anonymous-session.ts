import { Database } from "@packages/database/database";
import { checkBotId } from "botid/server";
import { Effect } from "effect";
import type { Context } from "hono";
import { signAnonymousToken } from "../../../lib/anonymous-auth";
import { runtime } from "../../../lib/runtime";

export async function handleAnonymousSession(c: Context) {
	const verification = await checkBotId({
		developmentOptions: {
			// TODO: Undisable
			bypass: "HUMAN", // process.env.NODE_ENV === "development" ? "HUMAN" : undefined,
		},
	});
	if (!verification.isHuman) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const session = await Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.private.anonymous_session.createAnonymousSession();
	}).pipe(runtime.runPromise);

	const token = await signAnonymousToken(session.sessionId);

	return c.json({
		token,
		sessionId: session.sessionId,
		expiresAt: session.expiresAt,
	});
}
