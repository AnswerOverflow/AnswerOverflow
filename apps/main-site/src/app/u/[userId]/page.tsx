import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { UserPageClient } from "./client";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ userId: string }>;
};

export default async function UserPage(props: Props) {
	const params = await props.params;

	// Get user account
	const userData = await Effect.gen(function* () {
		const database = yield* Database;
		const userLiveData = yield* Effect.scoped(
			database.discordAccounts.getDiscordAccountById(params.userId),
		);
		return userLiveData?.data;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!userData) {
		return notFound();
	}

	// Get messages from this user (limit to 50 for initial load)
	const messagesData = await Effect.gen(function* () {
		const database = yield* Database;
		const messagesLiveData = yield* Effect.scoped(
			database.messages.findMessagesByAuthorId(params.userId, 50),
		);
		return messagesLiveData?.data ?? [];
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	return <UserPageClient user={userData} messages={messagesData} />;
}
