import {
	ActionRow,
	Button,
	Container,
	Link,
	Result,
	Section,
	Separator,
	TextDisplay,
	useAtomSet,
	useAtomValue,
	useInstance,
} from "@packages/reacord";
import { Effect } from "effect";
import { atomRuntime } from "../../core/atom-runtime";

const fetchStatsEffect = () =>
	Effect.gen(function* () {
		yield* Effect.sleep("1 second");
		return {
			activeUsers: Math.floor(Math.random() * 10000) + 5000,
			messagesPerMin: Math.floor(Math.random() * 500) + 100,
			serverHealth: Math.random() > 0.1 ? "Operational" : "Degraded",
			uptime: "99.98%",
		};
	});

const statsAtom = atomRuntime.fn<void>()(fetchStatsEffect);

export function DashboardScenario() {
	const statsResult = useAtomValue(statsAtom);
	const refreshStats = useAtomSet(statsAtom);
	const instance = useInstance();

	const isInitial = Result.isInitial(statsResult);
	const isLoading = isInitial && statsResult.waiting;
	const hasData = Result.isSuccess(statsResult);
	const notStarted = isInitial && !statsResult.waiting;

	return (
		<>
			<Container accentColor={0xfee75c}>
				<TextDisplay>## Server Dashboard</TextDisplay>
				<TextDisplay>Real-time server statistics and monitoring</TextDisplay>
			</Container>

			<Separator />

			{notStarted ? (
				<Container accentColor={0x99aab5}>
					<TextDisplay>
						Click **Load Stats** to fetch server statistics.
					</TextDisplay>
				</Container>
			) : isLoading ? (
				<Container accentColor={0x5865f2}>
					<TextDisplay>Loading statistics...</TextDisplay>
				</Container>
			) : !hasData ? (
				<Container accentColor={0xed4245}>
					<TextDisplay>Failed to load statistics. Try again.</TextDisplay>
				</Container>
			) : (
				<>
					<Section
						accessory={{
							type: "button",
							label: "Refresh",
							style: "secondary",
							onClick: () => refreshStats(),
						}}
					>
						<TextDisplay>### Live Stats</TextDisplay>
						<TextDisplay>
							**Active Users:** {String(statsResult.value.activeUsers)}
						</TextDisplay>
						<TextDisplay>
							**Messages/min:** {String(statsResult.value.messagesPerMin)}
						</TextDisplay>
					</Section>

					<Container
						accentColor={
							statsResult.value.serverHealth === "Operational"
								? 0x57f287
								: 0xed4245
						}
					>
						<TextDisplay>
							**Status:** {statsResult.value.serverHealth}
						</TextDisplay>
						<TextDisplay>**Uptime:** {statsResult.value.uptime}</TextDisplay>
					</Container>
				</>
			)}

			<ActionRow>
				<Button
					label={isLoading ? "Loading..." : hasData ? "Refresh" : "Load Stats"}
					style="primary"
					disabled={isLoading}
					onClick={() => refreshStats()}
				/>
				<Link url="https://status.discord.com" label="Status Page" />
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
