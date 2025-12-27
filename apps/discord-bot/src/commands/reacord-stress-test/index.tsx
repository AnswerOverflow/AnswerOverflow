import {
	ActionRow,
	Button,
	Container,
	Option,
	Reacord,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { useState } from "react";
import { SUPER_USER_ID } from "../../constants/super-user";
import { Discord } from "../../core/discord-service";
import { commandExecuted } from "../../metrics";
import { catchAllWithReport } from "../../utils/error-reporting";
import { DashboardScenario } from "./dashboard";
import { FileComponentScenario } from "./file-component";
import { ImageGalleryScenario } from "./image-gallery";
import { ModalShowcaseScenario } from "./modal-showcase";
import { PollScenario } from "./poll";
import { ProductCardScenario } from "./product-card";
import { React19ActionStateScenario } from "./react19-action-state";
import { React19CartScenario } from "./react19-cart";
import { React19OptimisticScenario } from "./react19-optimistic";
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
	| "react19-cart";

const SCENARIO_INFO: Record<Scenario, { label: string; description: string }> =
	{
		"product-card": {
			label: "Product Card",
			description: "E-commerce product display",
		},
		"user-profile": {
			label: "User Profile",
			description: "User profile with stats",
		},
		"image-gallery": {
			label: "Image Gallery",
			description: "Image gallery with navigation",
		},
		dashboard: { label: "Dashboard", description: "Server stats dashboard" },
		wizard: { label: "Wizard", description: "Multi-step setup wizard" },
		poll: { label: "Poll", description: "Interactive voting poll" },
		"user-select": {
			label: "User Select",
			description: "User selection component",
		},
		"file-component": {
			label: "File Component",
			description: "File upload/display",
		},
		"modal-showcase": {
			label: "Modal Showcase",
			description: "Modal interactions demo",
		},
		"ticket-triage": {
			label: "Ticket Triage",
			description: "Ticket management system",
		},
		"react19-optimistic": {
			label: "React 19: Optimistic",
			description: "useOptimistic hook demo",
		},
		"react19-action-state": {
			label: "React 19: Action State",
			description: "useActionState hook demo",
		},
		"react19-use-hook": {
			label: "React 19: use() Hook",
			description: "use() hook with Suspense",
		},
		"react19-cart": {
			label: "React 19: Cart",
			description: "Combined React 19 features",
		},
	};

const scenarios = Object.keys(SCENARIO_INFO) as Scenario[];

function ScenarioContent({ scenario }: { scenario: Scenario }) {
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
	}
}

function ScenarioSelector() {
	const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
		null,
	);
	const instance = useInstance();

	if (selectedScenario) {
		return <ScenarioContent scenario={selectedScenario} />;
	}

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## Reacord Stress Test</TextDisplay>
				<TextDisplay>
					Select a scenario to test Reacord components and React 19 features.
				</TextDisplay>
			</Container>

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Available Scenarios</TextDisplay>
				<TextDisplay>
					**Classic Components:**{" "}
					{scenarios.filter((s) => !s.startsWith("react19")).length} scenarios
				</TextDisplay>
				<TextDisplay>
					**React 19 Features:**{" "}
					{scenarios.filter((s) => s.startsWith("react19")).length} scenarios
				</TextDisplay>
			</Container>

			<Select
				placeholder="Select a scenario..."
				onSelect={(value) => setSelectedScenario(value as Scenario)}
			>
				{scenarios.map((scenario) => (
					<Option
						key={scenario}
						value={scenario}
						label={SCENARIO_INFO[scenario].label}
						description={SCENARIO_INFO[scenario].description}
					/>
				))}
			</Select>

			<ActionRow>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
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

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	yield* reacord.reply(interaction, <ScenarioSelector />);
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
