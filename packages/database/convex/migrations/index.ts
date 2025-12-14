import { Migrations } from "@convex-dev/migrations";
import { getOneFrom } from "convex-helpers/server/relationships";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillChannelSettingsServerId = migrations.define({
	table: "channelSettings",
	migrateOne: async (ctx, settings) => {
		if (settings.serverId !== undefined) return;

		const channel = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			settings.channelId,
			"id",
		);

		if (!channel) {
			console.warn(
				`Channel not found for channelSettings ${settings._id} with channelId ${settings.channelId}`,
			);
			return;
		}

		await ctx.db.patch(settings._id, { serverId: channel.serverId });
	},
});

export const backfillChildThreadIdForThreadStarters = migrations.define({
	table: "messages",
	migrateOne: async (ctx, message) => {
		if (
			message.id === message.channelId &&
			message.childThreadId === undefined
		) {
			await ctx.db.patch(message._id, { childThreadId: message.channelId });
		}
	},
});

export const run = migrations.runner();
