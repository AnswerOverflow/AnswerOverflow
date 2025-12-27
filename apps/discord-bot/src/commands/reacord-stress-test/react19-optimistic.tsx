import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useOptimistic, useState, useTransition } from "react";

interface Message {
	id: string;
	text: string;
	sending: boolean;
}

function generateId() {
	return Math.random().toString(36).substring(2, 8);
}

async function simulateSend(text: string): Promise<Message> {
	await new Promise((resolve) => setTimeout(resolve, 1500));
	if (Math.random() < 0.2) {
		throw new Error("Network error - message failed to send");
	}
	return {
		id: generateId(),
		text,
		sending: false,
	};
}

export function React19OptimisticScenario() {
	const instance = useInstance();
	const [messages, setMessages] = useState<Message[]>([
		{ id: "1", text: "Welcome to the chat!", sending: false },
		{ id: "2", text: "This tests React 19 useOptimistic", sending: false },
	]);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const [optimisticMessages, addOptimisticMessage] = useOptimistic(
		messages,
		(state, newMessage: Message) => [...state, newMessage],
	);

	const predefinedMessages = [
		"Hello everyone!",
		"How's it going?",
		"React 19 is awesome!",
		"Testing optimistic updates",
	];

	const sendMessage = (text: string) => {
		setError(null);
		const optimisticId = `temp-${generateId()}`;

		startTransition(async () => {
			addOptimisticMessage({
				id: optimisticId,
				text,
				sending: true,
			});

			try {
				const confirmedMessage = await simulateSend(text);
				setMessages((prev) => [...prev, confirmedMessage]);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to send");
			}
		});
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: useOptimistic Hook</TextDisplay>
				<TextDisplay>
					Messages appear instantly (optimistically) while sending in the
					background. ~20% chance of failure to demonstrate error handling.
				</TextDisplay>
			</Container>

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Chat Messages</TextDisplay>
				{optimisticMessages.slice(-8).map((msg) => (
					<TextDisplay key={msg.id}>
						{msg.sending ? "⏳" : "✓"} {msg.text}
						{msg.sending && " _(sending...)_"}
					</TextDisplay>
				))}
				{optimisticMessages.length === 0 && (
					<TextDisplay>_No messages yet_</TextDisplay>
				)}
			</Container>

			{error && (
				<Container accentColor={0xed4245}>
					<TextDisplay>**Error:** {error}</TextDisplay>
				</Container>
			)}

			<Container accentColor={isPending ? 0xfee75c : 0x57f287}>
				<TextDisplay>
					**Status:** {isPending ? "Sending..." : "Ready"}
				</TextDisplay>
				<TextDisplay>
					**Total messages:** {messages.length} (confirmed) |{" "}
					{optimisticMessages.length} (displayed)
				</TextDisplay>
			</Container>

			<ActionRow>
				{predefinedMessages.slice(0, 4).map((msg, i) => (
					<Button
						key={i}
						label={msg.substring(0, 20)}
						style="primary"
						disabled={isPending}
						onClick={() => sendMessage(msg)}
					/>
				))}
			</ActionRow>

			<ActionRow>
				<Button
					label="Clear Messages"
					style="secondary"
					onClick={() => {
						setMessages([]);
						setError(null);
					}}
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
