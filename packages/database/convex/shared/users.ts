import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import type { MutationCtx, QueryCtx } from "../client";

export async function getDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await getOneFrom(
		ctx.db,
		"discordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);
}

export async function findIgnoredDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await getOneFrom(
		ctx.db,
		"ignoredDiscordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);
}

export async function upsertIgnoredDiscordAccountInternalLogic(
	ctx: MutationCtx,
	id: bigint,
) {
	const existingIgnored = await getOneFrom(
		ctx.db,
		"ignoredDiscordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);

	if (existingIgnored) {
		return existingIgnored;
	}

	await ctx.db.insert("ignoredDiscordAccounts", { id });

	const upserted = await getOneFrom(
		ctx.db,
		"ignoredDiscordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);

	if (!upserted) {
		throw new Error("Failed to upsert account");
	}

	return upserted;
}

export async function findUserServerSettingsById(
	ctx: QueryCtx | MutationCtx,
	userId: bigint,
	serverId: bigint,
) {
	const settings = await ctx.db
		.query("userServerSettings")
		.withIndex("by_userId_serverId", (q) =>
			q.eq("userId", userId).eq("serverId", serverId),
		)
		.first();
	return settings ?? null;
}

export async function deleteUserServerSettingsByUserIdLogic(
	ctx: MutationCtx,
	userId: bigint,
): Promise<void> {
	const settings = await getManyFrom(
		ctx.db,
		"userServerSettings",
		"by_userId",
		userId,
	);

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}
}
