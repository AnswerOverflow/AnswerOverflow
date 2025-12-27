import {
	ActionRow,
	Button,
	Container,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function PollScenario() {
	const [votes, setVotes] = useState<Record<string, number>>({
		cats: 0,
		dogs: 0,
		birds: 0,
		fish: 0,
	});
	const [userVote, setUserVote] = useState<string | null>(null);
	const instance = useInstance();

	const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

	const getBar = (option: string) => {
		const count = votes[option] ?? 0;
		const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
		const filled = Math.round(percent / 5);
		return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${percent.toFixed(0)}%`;
	};

	const handleVote = (option: string) => {
		if (userVote) {
			setVotes((v) => ({
				...v,
				[userVote]: Math.max(0, (v[userVote] ?? 0) - 1),
				[option]: (v[option] ?? 0) + 1,
			}));
		} else {
			setVotes((v) => ({
				...v,
				[option]: (v[option] ?? 0) + 1,
			}));
		}
		setUserVote(option);
	};

	return (
		<>
			<Container accentColor={0xeb459e}>
				<TextDisplay>## What's the best pet?</TextDisplay>
				<TextDisplay>
					Vote for your favorite! **Total votes:** {totalVotes}
				</TextDisplay>
			</Container>

			<Container accentColor={userVote === "cats" ? 0x57f287 : 0x99aab5}>
				<TextDisplay>**Cats** `{getBar("cats")}`</TextDisplay>
			</Container>

			<Container accentColor={userVote === "dogs" ? 0x57f287 : 0x99aab5}>
				<TextDisplay>**Dogs** `{getBar("dogs")}`</TextDisplay>
			</Container>

			<Container accentColor={userVote === "birds" ? 0x57f287 : 0x99aab5}>
				<TextDisplay>**Birds** `{getBar("birds")}`</TextDisplay>
			</Container>

			<Container accentColor={userVote === "fish" ? 0x57f287 : 0x99aab5}>
				<TextDisplay>**Fish** `{getBar("fish")}`</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label="Cats"
					style={userVote === "cats" ? "success" : "secondary"}
					onClick={() => handleVote("cats")}
				/>
				<Button
					label="Dogs"
					style={userVote === "dogs" ? "success" : "secondary"}
					onClick={() => handleVote("dogs")}
				/>
				<Button
					label="Birds"
					style={userVote === "birds" ? "success" : "secondary"}
					onClick={() => handleVote("birds")}
				/>
				<Button
					label="Fish"
					style={userVote === "fish" ? "success" : "secondary"}
					onClick={() => handleVote("fish")}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
