import type { DiscordAccount } from "@packages/database/convex/schema";
import { getDashboardPermissionMask } from "@packages/database/convex/shared/permissionsShared";
import { Database } from "@packages/database/database";
import type { GuildMember, PartialUser, User } from "discord.js";
import { Console, Data, Duration, Effect, Equal, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed, syncOperations } from "../metrics";
import { trackUserJoinedServer, trackUserLeftServer } from "../utils/analytics";
import { createBatchedQueue } from "../utils/batched-queue";
import { toAODiscordAccount } from "../utils/conversions";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const BATCH_CONFIG = {
	maxBatchSize: process.env.NODE_ENV === "production" ? 10 : 1,
	maxWait: Duration.millis(3000),
} as const;

function hasRelevantChanges(
	oldUser: User | PartialUser,
	newUser: User,
): boolean {
	if (oldUser.partial) return true;
	const oldAccount = Data.struct(toAODiscordAccount(oldUser));
	const newAccount = Data.struct(toAODiscordAccount(newUser));
	return !Equal.equals(oldAccount, newAccount);
}

type MemberAccessState = {
	partial?: boolean;
	guild: { id: string };
	permissions: { bitfield: bigint };
	roles: { cache: ReadonlyMap<string, unknown> };
};

type MemberIdentity = {
	guild: { id: string };
	user: { id: string };
};

function normalizeRoleIds(roleIds: readonly bigint[]): bigint[] {
	return [...new Set(roleIds)].sort((left, right) => {
		if (left === right) {
			return 0;
		}
		return left < right ? -1 : 1;
	});
}

function haveSameRoleIds(
	left: readonly bigint[] | undefined,
	right: readonly bigint[] | undefined,
): boolean {
	const normalizedLeft = normalizeRoleIds(left ?? []);
	const normalizedRight = normalizeRoleIds(right ?? []);

	if (normalizedLeft.length !== normalizedRight.length) {
		return false;
	}

	return normalizedLeft.every(
		(roleId, index) => roleId === normalizedRight[index],
	);
}

export function getMemberRoleIds(member: MemberAccessState): bigint[] {
	return normalizeRoleIds(
		[...member.roles.cache.keys()]
			.filter((roleId) => roleId !== member.guild.id)
			.map((roleId) => BigInt(roleId)),
	);
}

export function getMemberPermissions(member: MemberAccessState): number {
	return getDashboardPermissionMask(member.permissions.bitfield);
}

export function hasRelevantMemberAccessChanges(
	oldMember: MemberAccessState,
	newMember: MemberAccessState,
): boolean {
	if (oldMember.partial) return true;

	return (
		getMemberPermissions(oldMember) !== getMemberPermissions(newMember) ||
		!haveSameRoleIds(getMemberRoleIds(oldMember), getMemberRoleIds(newMember))
	);
}

const invalidateUserGuildsCacheForMember = (
	database: Effect.Effect.Success<typeof Database>,
	discordUserId: string,
) =>
	Effect.gen(function* () {
		const oauthAccount =
			yield* database.private.cache.findDiscordOAuthAccountByDiscordId({
				discordId: discordUserId,
			});

		if (!oauthAccount) {
			return;
		}

		yield* database.private.cache.invalidateUserGuildsCache({
			discordAccountId: BigInt(oauthAccount.accountId),
		});
	}).pipe(
		catchAllWithReport((error) =>
			Console.error(
				`Error invalidating guilds cache for user ${discordUserId}:`,
				error,
			),
		),
	);

const syncExistingMemberServerSettings = (
	database: Effect.Effect.Success<typeof Database>,
	member: GuildMember,
) =>
	Effect.gen(function* () {
		const userId = BigInt(member.user.id);
		const serverId = BigInt(member.guild.id);
		const existingSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId,
				serverId,
			});

		if (!existingSettings) {
			return false;
		}

		const permissions = getMemberPermissions(member);
		const roleIds = getMemberRoleIds(member);

		if (
			existingSettings.permissions === permissions &&
			haveSameRoleIds(existingSettings.roleIds, roleIds)
		) {
			return false;
		}

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings: {
				userId,
				serverId,
				permissions,
				roleIds,
				canPubliclyDisplayMessages: existingSettings.canPubliclyDisplayMessages,
				messageIndexingDisabled: existingSettings.messageIndexingDisabled,
				apiKey: existingSettings.apiKey,
				apiCallsUsed: existingSettings.apiCallsUsed,
				botAddedTimestamp: existingSettings.botAddedTimestamp,
			},
		});

		return true;
	});

const deleteExistingMemberServerSettings = (
	database: Effect.Effect.Success<typeof Database>,
	member: MemberIdentity,
) =>
	Effect.gen(function* () {
		const userId = BigInt(member.user.id);
		const serverId = BigInt(member.guild.id);
		const existingSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId,
				serverId,
			});

		if (!existingSettings) {
			return false;
		}

		yield* database.private.user_server_settings.deleteUserServerSettings({
			userId,
			serverId,
		});

		return true;
	});

export const UserParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		const accountQueue = yield* createBatchedQueue<
			DiscordAccount,
			unknown,
			Database
		>({
			process: (batch) =>
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"batch.size": batch.length.toString(),
						"batch.type": "user_update_accounts",
					});
					yield* Effect.logDebug(
						`Processing user update account batch of ${batch.length} items`,
					);
					yield* database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts: batch,
					});
				}).pipe(Effect.withSpan("sync.user_update_account_batch")),
			maxBatchSize: BATCH_CONFIG.maxBatchSize,
			maxWait: BATCH_CONFIG.maxWait,
		});

		yield* Effect.logInfo("User parity batched queue initialized");

		yield* discord.client.on("userUpdate", (oldUser, newUser) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": newUser.id,
					"discord.username": newUser.username,
				});
				yield* Metric.increment(eventsProcessed);

				if (!hasRelevantChanges(oldUser, newUser)) {
					return;
				}

				yield* Metric.increment(syncOperations);
				yield* accountQueue.offer(toAODiscordAccount(newUser));
			}).pipe(
				Effect.withSpan("event.user_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating Discord account ${newUser.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberAdd", (member) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": member.user.id,
					"discord.username": member.user.username,
					"discord.guild_id": member.guild.id,
					"discord.guild_name": member.guild.name,
				});
				yield* Metric.increment(eventsProcessed);

				yield* invalidateUserGuildsCacheForMember(database, member.user.id);
				const didSyncSettings = yield* syncExistingMemberServerSettings(
					database,
					member,
				);

				if (didSyncSettings) {
					yield* Metric.increment(syncOperations);
				}

				const serverData = yield* database.private.servers.getServerByDiscordId(
					{
						discordId: BigInt(member.guild.id),
					},
				);
				if (!serverData) return;

				const preferencesData =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{
							serverId: BigInt(member.guild.id),
						},
					);

				yield* catchAllSilentWithReport(
					trackUserJoinedServer(
						member,
						{
							discordId: serverData.discordId.toString(),
							name: serverData.name,
						},
						preferencesData
							? {
									readTheRulesConsentEnabled:
										preferencesData.readTheRulesConsentEnabled,
								}
							: undefined,
					),
				);
			}).pipe(
				Effect.withSpan("event.guild_member_add"),
				catchAllWithReport((error) =>
					Console.error(`Error handling guild member add ${member.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberUpdate", (oldMember, newMember) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": newMember.user.id,
					"discord.username": newMember.user.username,
					"discord.guild_id": newMember.guild.id,
					"discord.guild_name": newMember.guild.name,
				});
				yield* Metric.increment(eventsProcessed);

				if (!hasRelevantMemberAccessChanges(oldMember, newMember)) {
					return;
				}

				yield* invalidateUserGuildsCacheForMember(database, newMember.user.id);

				const didSyncSettings = yield* syncExistingMemberServerSettings(
					database,
					newMember,
				);

				if (didSyncSettings) {
					yield* Metric.increment(syncOperations);
				}
			}).pipe(
				Effect.withSpan("event.guild_member_update"),
				catchAllWithReport((error) =>
					Console.error(
						`Error handling guild member update ${newMember.id}:`,
						error,
					),
				),
			),
		);

		yield* discord.client.on("guildMemberRemove", (member) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": member.user.id,
					"discord.username": member.user.username,
					"discord.guild_id": member.guild.id,
					"discord.guild_name": member.guild.name,
				});
				yield* Metric.increment(eventsProcessed);

				yield* invalidateUserGuildsCacheForMember(database, member.user.id);
				const didDeleteSettings = yield* deleteExistingMemberServerSettings(
					database,
					member,
				);

				if (didDeleteSettings) {
					yield* Metric.increment(syncOperations);
				}

				const serverData = yield* database.private.servers.getServerByDiscordId(
					{
						discordId: BigInt(member.guild.id),
					},
				);
				if (!serverData) return;

				const preferencesData =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{
							serverId: BigInt(member.guild.id),
						},
					);

				yield* catchAllSilentWithReport(
					trackUserLeftServer(
						member,
						{
							discordId: serverData.discordId.toString(),
							name: serverData.name,
						},
						preferencesData
							? {
									readTheRulesConsentEnabled:
										preferencesData.readTheRulesConsentEnabled,
								}
							: undefined,
					),
				);
			}).pipe(
				Effect.withSpan("event.guild_member_remove"),
				catchAllWithReport((error) =>
					Console.error(
						`Error handling guild member remove ${member.id}:`,
						error,
					),
				),
			),
		);
	}),
);
