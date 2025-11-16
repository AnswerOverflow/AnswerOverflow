import { checkBotId } from "botid/server";
import type { Context } from "hono";

export async function handleAnonymousSession(c: Context) {
	const verification = await checkBotId();
	if (!verification.isHuman) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	return c.json({ message: "Anonymous session" });
}
