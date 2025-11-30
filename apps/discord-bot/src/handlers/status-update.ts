import { type ActivityOptions, ActivityType } from "discord.js";
import { Console, Duration, Effect, Layer, Ref, Schedule } from "effect";
import { Discord } from "../core/discord-service";

type StatusUpdate = {
	getStatus: (() => Effect.Effect<string>) | string;
} & Omit<ActivityOptions, "name">;

function getStatuses(): StatusUpdate[] {
	return [
		// {
		// 	type: ActivityType.Watching,
		// 	getStatus: () =>
		// 		Effect.gen(function* () {
		// 			const discord = yield* Discord;
		// 			const guilds = yield* discord.getGuilds();
		// 			return `${guilds.length.toLocaleString()} communities!`;
		// 		}),
		// },
		// Convex isn't great at find many, we need to find a more efficent way to do this
		// {
		// 	type: ActivityType.Listening,
		// 	getStatus: () =>
		// 		Effect.gen(function* () {
		// 			const database = yield* Database;
		// 			const numMessages = yield* database.private.messages.getTotalMessageCount(
		// 				{},
		// 			);
		// 			return `${numMessages.toLocaleString()} messages`;
		// 		}),
		// },
		{
			type: ActivityType.Watching,
			getStatus: "Open source! github.com/AnswerOverflow",
		},
		// {
		// 	type: ActivityType.Listening,
		// 	getStatus: () =>
		// 		Effect.gen(function* () {
		// 			const discord = yield* Discord;
		// 			const guilds = yield* discord.getGuilds();
		// 			const totalMemberCount = guilds.reduce(
		// 				(total, guild) => total + (guild.memberCount ?? 0),
		// 				0,
		// 			);
		// 			return `${totalMemberCount.toLocaleString()} users asking questions!`;
		// 		}),
		// },
		// {
		// 	type: ActivityType.Watching,
		// 	getStatus: () => Effect.succeed("help channels index into Google"),
		// },
	];
}

function updateStatus(statusIndex: Ref.Ref<number>) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		const statuses = getStatuses();
		const currentIndex = yield* Ref.get(statusIndex);
		const status = statuses[currentIndex];

		if (!status) {
			yield* Console.error(`No status found for index ${currentIndex}`);
			return;
		}

		const nextIndex = (currentIndex + 1) % statuses.length;
		yield* Ref.set(statusIndex, nextIndex);

		const statusText =
			typeof status.getStatus === "string"
				? status.getStatus
				: yield* status.getStatus();

		yield* discord.setActivity(statusText, {
			type: status.type,
		});

		yield* Console.log(`Setting status to ${statusText}`);
	}).pipe(
		Effect.catchAllCause((cause) =>
			Console.error("Failed to update status:", cause),
		),
	);
}

function startStatusUpdateLoop() {
	return Effect.gen(function* () {
		const statusUpdateIntervalHours = Number(
			process.env.STATUS_UPDATE_INTERVAL_IN_HOURS ?? "1",
		);

		const statusIndex = yield* Ref.make(0);

		const schedule = Schedule.fixed(Duration.hours(statusUpdateIntervalHours));

		yield* updateStatus(statusIndex);

		yield* Effect.fork(
			Effect.repeat(updateStatus(statusIndex), schedule).pipe(
				Effect.catchAllCause((cause) =>
					Console.error("Error in scheduled status update:", cause),
				),
			),
		);

		yield* Console.log("Status update loop started");
	});
}

export const StatusUpdateHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("clientReady", () => startStatusUpdateLoop());
	}),
);
