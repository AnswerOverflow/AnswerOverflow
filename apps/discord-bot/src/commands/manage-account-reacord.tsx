import { PostHogCaptureClientLayer } from "@packages/database/analytics/server/capture-client";
import { Database } from "@packages/database/database";
import {
	ActionRow,
	Atom,
	Button,
	Container,
	Reacord,
	Result,
	TextDisplay,
	useAtomSet,
	useAtomValue,
	useInstance,
} from "@packages/reacord";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import { Data, Duration, Effect, Layer, Metric } from "effect";
import { atomRuntime } from "../core/atom-runtime";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

class ManageAccountTimeoutError extends Data.TaggedError(
	"ManageAccountTimeoutError",
)<{
	message: string;
	guildId?: string;
	channelId?: string;
	userId: string;
}> {}

type ManageAccountState = {
	canPubliclyDisplayMessages: boolean;
	messageIndexingDisabled: boolean;
	isIgnoredAccount: boolean;
};

type ManageAccountInput = {
	userId: bigint;
	serverId: bigint;
	guildMember?: GuildMember;
};

type ConsentInput = ManageAccountInput & {
	enable: boolean;
};

type IndexingInput = ManageAccountInput & {
	disable: boolean;
};

type IgnoreInput = ManageAccountInput & {
	ignore: boolean;
};

const loadAccountStateEffect = (input: { userId: bigint; serverId: bigint }) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const userServerSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: input.userId,
				serverId: input.serverId,
			});

		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: input.userId,
				},
			);

		return {
			canPubliclyDisplayMessages:
				userServerSettings?.canPubliclyDisplayMessages ?? false,
			messageIndexingDisabled:
				userServerSettings?.messageIndexingDisabled ?? false,
			isIgnoredAccount: ignoredAccount !== null,
		};
	});

const toggleConsentEffect = (input: ConsentInput) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const existingSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: input.userId,
				serverId: input.serverId,
			});

		const updatedSettings = existingSettings
			? {
					userId: existingSettings.userId,
					serverId: existingSettings.serverId,
					permissions: existingSettings.permissions,
					canPubliclyDisplayMessages: input.enable,
					messageIndexingDisabled: existingSettings.messageIndexingDisabled,
					apiKey: existingSettings.apiKey,
					apiCallsUsed: existingSettings.apiCallsUsed,
					botAddedTimestamp: existingSettings.botAddedTimestamp,
				}
			: {
					userId: input.userId,
					serverId: input.serverId,
					permissions: 0,
					canPubliclyDisplayMessages: input.enable,
					messageIndexingDisabled: false,
					apiCallsUsed: 0,
				};

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings: updatedSettings,
		});

		if (input.enable && input.guildMember) {
			yield* catchAllSilentWithReport(
				trackUserGrantConsent(
					input.guildMember,
					ConsentSource.ManageAccountMenu,
				).pipe(Effect.provide(PostHogCaptureClientLayer)),
			);
		}

		return { canPubliclyDisplayMessages: input.enable };
	});

const toggleIndexingEffect = (input: IndexingInput) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const existingSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: input.userId,
				serverId: input.serverId,
			});

		const updatedSettings = existingSettings
			? {
					userId: existingSettings.userId,
					serverId: existingSettings.serverId,
					permissions: existingSettings.permissions,
					canPubliclyDisplayMessages: input.disable
						? false
						: existingSettings.canPubliclyDisplayMessages,
					messageIndexingDisabled: input.disable,
					apiKey: existingSettings.apiKey,
					apiCallsUsed: existingSettings.apiCallsUsed,
					botAddedTimestamp: existingSettings.botAddedTimestamp,
				}
			: {
					userId: input.userId,
					serverId: input.serverId,
					permissions: 0,
					canPubliclyDisplayMessages: false,
					messageIndexingDisabled: input.disable,
					apiCallsUsed: 0,
				};

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings: updatedSettings,
		});

		return {
			messageIndexingDisabled: input.disable,
			canPubliclyDisplayMessages: input.disable
				? false
				: (existingSettings?.canPubliclyDisplayMessages ?? false),
		};
	});

const toggleIgnoreEffect = (input: IgnoreInput) =>
	Effect.gen(function* () {
		const database = yield* Database;

		if (input.ignore) {
			yield* database.private.discord_accounts.deleteDiscordAccount({
				id: input.userId,
			});
		} else {
			yield* database.private.ignored_discord_accounts.deleteIgnoredDiscordAccount(
				{
					id: input.userId,
				},
			);
		}

		return { isIgnoredAccount: input.ignore };
	});

const accountStateAtomFamily = Atom.family(
	(key: { userId: string; serverId: string }) =>
		atomRuntime.atom(
			loadAccountStateEffect({
				userId: BigInt(key.userId),
				serverId: BigInt(key.serverId),
			}),
		),
);

const toggleConsentAtom = atomRuntime.fn<ConsentInput>()(toggleConsentEffect);
const toggleIndexingAtom =
	atomRuntime.fn<IndexingInput>()(toggleIndexingEffect);
const toggleIgnoreAtom = atomRuntime.fn<IgnoreInput>()(toggleIgnoreEffect);

type ManageAccountProps = {
	userId: string;
	serverId: string;
	guildMember?: GuildMember;
	initialState: ManageAccountState;
};

function ManageAccountUI({
	userId,
	serverId,
	guildMember,
	initialState,
}: ManageAccountProps) {
	const accountStateResult = useAtomValue(
		accountStateAtomFamily({ userId, serverId }),
	);
	const instance = useInstance();

	const toggleConsentResult = useAtomValue(toggleConsentAtom);
	const triggerToggleConsent = useAtomSet(toggleConsentAtom);

	const toggleIndexingResult = useAtomValue(toggleIndexingAtom);
	const triggerToggleIndexing = useAtomSet(toggleIndexingAtom);

	const toggleIgnoreResult = useAtomValue(toggleIgnoreAtom);
	const triggerToggleIgnore = useAtomSet(toggleIgnoreAtom);

	const isLoading =
		(Result.isInitial(toggleConsentResult) && toggleConsentResult.waiting) ||
		(Result.isInitial(toggleIndexingResult) && toggleIndexingResult.waiting) ||
		(Result.isInitial(toggleIgnoreResult) && toggleIgnoreResult.waiting);

	const state: ManageAccountState = Result.isSuccess(accountStateResult)
		? {
				canPubliclyDisplayMessages: Result.isSuccess(toggleConsentResult)
					? toggleConsentResult.value.canPubliclyDisplayMessages
					: Result.isSuccess(toggleIndexingResult)
						? toggleIndexingResult.value.canPubliclyDisplayMessages
						: accountStateResult.value.canPubliclyDisplayMessages,
				messageIndexingDisabled: Result.isSuccess(toggleIndexingResult)
					? toggleIndexingResult.value.messageIndexingDisabled
					: accountStateResult.value.messageIndexingDisabled,
				isIgnoredAccount: Result.isSuccess(toggleIgnoreResult)
					? toggleIgnoreResult.value.isIgnoredAccount
					: accountStateResult.value.isIgnoredAccount,
			}
		: initialState;

	const userIdBigInt = BigInt(userId);
	const serverIdBigInt = BigInt(serverId);

	if (state.isIgnoredAccount) {
		return (
			<>
				<Container accentColor={0xff6b6b}>
					<TextDisplay>## Manage Your Account</TextDisplay>
					<TextDisplay>
						Your account is currently being ignored globally. You can stop
						ignoring it by clicking the button below.
					</TextDisplay>
				</Container>
				<ActionRow>
					<Button
						label={isLoading ? "Processing..." : "Stop Ignoring Globally"}
						style="success"
						disabled={isLoading}
						onClick={() => {
							triggerToggleIgnore({
								userId: userIdBigInt,
								serverId: serverIdBigInt,
								guildMember,
								ignore: false,
							});
						}}
					/>
					<Button
						label="Dismiss"
						style="secondary"
						onClick={() => {
							instance.destroy();
						}}
					/>
				</ActionRow>
			</>
		);
	}

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## Manage Your Account</TextDisplay>
				<TextDisplay>
					Here, you can manage how Answer Overflow interacts with your account.
				</TextDisplay>
				<TextDisplay>
					**Display Messages Publicly:**{" "}
					{state.canPubliclyDisplayMessages ? "Enabled" : "Disabled"}
				</TextDisplay>
				<TextDisplay>
					**Message Indexing:**{" "}
					{state.messageIndexingDisabled ? "Disabled" : "Enabled"}
				</TextDisplay>
			</Container>
			<ActionRow>
				{state.canPubliclyDisplayMessages ? (
					<Button
						label={isLoading ? "Processing..." : "Disable Public Display"}
						style="danger"
						disabled={isLoading}
						onClick={() => {
							triggerToggleConsent({
								userId: userIdBigInt,
								serverId: serverIdBigInt,
								guildMember,
								enable: false,
							});
						}}
					/>
				) : (
					<Button
						label={isLoading ? "Processing..." : "Enable Public Display"}
						style="success"
						disabled={isLoading}
						onClick={() => {
							triggerToggleConsent({
								userId: userIdBigInt,
								serverId: serverIdBigInt,
								guildMember,
								enable: true,
							});
						}}
					/>
				)}
				{state.messageIndexingDisabled ? (
					<Button
						label={isLoading ? "Processing..." : "Enable Indexing"}
						style="success"
						disabled={isLoading}
						onClick={() => {
							triggerToggleIndexing({
								userId: userIdBigInt,
								serverId: serverIdBigInt,
								guildMember,
								disable: false,
							});
						}}
					/>
				) : (
					<Button
						label={isLoading ? "Processing..." : "Disable Indexing"}
						style="danger"
						disabled={isLoading}
						onClick={() => {
							triggerToggleIndexing({
								userId: userIdBigInt,
								serverId: serverIdBigInt,
								guildMember,
								disable: true,
							});
						}}
					/>
				)}
				<Button
					label={isLoading ? "Processing..." : "Ignore Globally"}
					style="danger"
					disabled={isLoading}
					onClick={() => {
						triggerToggleIgnore({
							userId: userIdBigInt,
							serverId: serverIdBigInt,
							guildMember,
							ignore: true,
						});
					}}
				/>
			</ActionRow>
			<ActionRow>
				<Button
					label="Dismiss"
					style="secondary"
					onClick={() => {
						instance.destroy();
					}}
				/>
			</ActionRow>
		</>
	);
}

export const handleManageAccountCommand = Effect.fn("manage_account_command")(
	function* (interaction: ChatInputCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("manage_account"));

		const database = yield* Database;
		const discord = yield* Discord;
		const reacord = yield* Reacord;

		if (!interaction.guildId || !interaction.member) {
			yield* discord.callClient(() =>
				interaction.reply({
					content: "This command can only be used in a server",
					flags: MessageFlags.Ephemeral,
				}),
			);
			return;
		}

		yield* discord.callClient(() =>
			interaction.deferReply({ flags: MessageFlags.Ephemeral }),
		);

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(interaction.guildId),
			},
		);

		const server = serverLiveData;

		if (!server) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Server not found in database",
				}),
			);
			return;
		}

		const userIdBigInt = BigInt(interaction.user.id);
		const serverIdBigInt = server.discordId;

		const userServerSettings =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: userIdBigInt,
				serverId: serverIdBigInt,
			});

		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: userIdBigInt,
				},
			);

		const initialState: ManageAccountState = {
			canPubliclyDisplayMessages:
				userServerSettings?.canPubliclyDisplayMessages ?? false,
			messageIndexingDisabled:
				userServerSettings?.messageIndexingDisabled ?? false,
			isIgnoredAccount: ignoredAccount !== null,
		};

		const member = interaction.member;
		const guildMember =
			member instanceof Object && "id" in member
				? (member as GuildMember)
				: undefined;

		yield* reacord.reply(
			interaction,
			<ManageAccountUI
				userId={interaction.user.id}
				serverId={server.discordId.toString()}
				guildMember={guildMember}
				initialState={initialState}
			/>,
		);
	},
);

export const ManageAccountReacordLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "manage-account"
				) {
					return;
				}

				const commandWithTimeout = handleManageAccountCommand(interaction).pipe(
					Effect.timeoutFail({
						duration: Duration.seconds(25),
						onTimeout: () =>
							new ManageAccountTimeoutError({
								message: "Manage account command timed out after 25 seconds",
								guildId: interaction.guildId ?? undefined,
								channelId: interaction.channelId ?? undefined,
								userId: interaction.user.id,
							}),
					}),
				);

				const handleInteractionError = (message: string) =>
					Effect.gen(function* () {
						if (interaction.deferred || interaction.replied) {
							yield* catchAllSilentWithReport(
								discord.callClient(() =>
									interaction.editReply({ content: message }),
								),
							);
						} else {
							yield* catchAllSilentWithReport(
								discord.callClient(() =>
									interaction.reply({
										content: message,
										flags: MessageFlags.Ephemeral,
									}),
								),
							);
						}
					});

				yield* commandWithTimeout.pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							console.error("Manage account command failed:", error);
							yield* handleInteractionError(
								"An error occurred while processing your request.",
							);
						}),
					),
					catchAllDefectWithReport((defect) =>
						Effect.gen(function* () {
							console.error("Manage account command defect:", defect);
							yield* handleInteractionError(
								"An unexpected error occurred. Please try again.",
							);
						}),
					),
				);
			}),
		);
	}),
);
