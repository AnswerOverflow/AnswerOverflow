import { Reacord } from "@packages/reacord";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../../constants/super-user";
import { Discord } from "../../core/discord-service";
import { commandExecuted } from "../../metrics";
import { catchAllWithReport } from "../../utils/error-reporting";
import { DashboardScenario } from "./dashboard";
import { FileComponentScenario } from "./file-component";
import { ImageGalleryScenario } from "./image-gallery";
import { LLMStreamingScenario } from "./llm-streaming";
import { ModalShowcaseScenario } from "./modal-showcase";
import { PollScenario } from "./poll";
import { ProductCardScenario } from "./product-card";
import { ReactHooksScenario } from "./react-hooks";
import { ReactKitchenSinkScenario } from "./react-kitchen-sink";
import { React19ActionStateScenario } from "./react19-action-state";
import { React19CartScenario } from "./react19-cart";
import { React19ContextScenario } from "./react19-context";
import { React19DeferredScenario } from "./react19-deferred";
import { React19OptimisticScenario } from "./react19-optimistic";
import { React19RefScenario } from "./react19-ref";
import { React19UseHookScenario } from "./react19-use-hook";
import { TicketTriageScenario } from "./ticket-triage";
import { UserProfileScenario } from "./user-profile";
import { UserSelectScenario } from "./user-select";
import { WizardScenario } from "./wizard";

const COMMAND_NAME = "reacord-stress-test";

type Scenario =
	| "product-card"
	| "user-profile"
	| "image-gallery"
	| "dashboard"
	| "wizard"
	| "poll"
	| "user-select"
	| "file-component"
	| "modal-showcase"
	| "ticket-triage"
	| "react19-optimistic"
	| "react19-action-state"
	| "react19-use-hook"
	| "react19-cart"
	| "react19-context"
	| "react19-deferred"
	| "react19-ref"
	| "react-hooks"
	| "react-kitchen-sink"
	| "llm-streaming";

const scenarios: Scenario[] = [
	"product-card",
	"user-profile",
	"image-gallery",
	"dashboard",
	"wizard",
	"poll",
	"user-select",
	"file-component",
	"modal-showcase",
	"ticket-triage",
	"react19-optimistic",
	"react19-action-state",
	"react19-use-hook",
	"react19-cart",
	"react19-context",
	"react19-deferred",
	"react19-ref",
	"react-hooks",
	"react-kitchen-sink",
	"llm-streaming",
];

type StressTestProps = {
	scenario: Scenario;
};

function StressTest({ scenario }: StressTestProps) {
	switch (scenario) {
		case "product-card":
			return <ProductCardScenario />;
		case "user-profile":
			return <UserProfileScenario />;
		case "image-gallery":
			return <ImageGalleryScenario />;
		case "dashboard":
			return <DashboardScenario />;
		case "wizard":
			return <WizardScenario />;
		case "poll":
			return <PollScenario />;
		case "user-select":
			return <UserSelectScenario />;
		case "file-component":
			return <FileComponentScenario />;
		case "modal-showcase":
			return <ModalShowcaseScenario />;
		case "ticket-triage":
			return <TicketTriageScenario />;
		case "react19-optimistic":
			return <React19OptimisticScenario />;
		case "react19-action-state":
			return <React19ActionStateScenario />;
		case "react19-use-hook":
			return <React19UseHookScenario />;
		case "react19-cart":
			return <React19CartScenario />;
		case "react19-context":
			return <React19ContextScenario />;
		case "react19-deferred":
			return <React19DeferredScenario />;
		case "react19-ref":
			return <React19RefScenario />;
		case "react-hooks":
			return <ReactHooksScenario />;
		case "react-kitchen-sink":
			return <ReactKitchenSinkScenario />;
		case "llm-streaming":
			return <LLMStreamingScenario />;
	}
}

export const handleReacordStressTestCommand = Effect.fn(
	"reacord_stress_test_command",
)(function* (interaction: ChatInputCommandInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("reacord_stress_test"));

	const discord = yield* Discord;
	const reacord = yield* Reacord;

	if (interaction.user.id !== SUPER_USER_ID) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This command is only available to Rhys.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const scenarioOption = interaction.options.getString("scenario", true);
	const scenario = scenarioOption as Scenario;

	if (!scenarios.includes(scenario)) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: `Invalid scenario. Available: ${scenarios.join(", ")}`,
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	yield* reacord.reply(interaction, <StressTest scenario={scenario} />);
});

export const ReacordStressTestLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== COMMAND_NAME
				) {
					return;
				}
				yield* handleReacordStressTestCommand(interaction).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							console.error("Reacord stress test error:", error);

							yield* discord.callClient(() =>
								interaction.editReply({
									content: `Error: ${error instanceof Error ? error.message : String(error)}`,
								}),
							);
						}),
					),
				);
			}),
		);
	}),
);

export const REACORD_STRESS_TEST_SCENARIOS = scenarios;
