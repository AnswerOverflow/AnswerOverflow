import {
	ActionRow,
	Button,
	Container,
	Loading,
	LoadingSelect,
	ModalButton,
	type ModalFieldValues,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import {
	createOpencodeClient,
	type OpencodeClient,
	type Session,
} from "@opencode-ai/sdk";
import type { ModalSubmitInteraction } from "discord.js";
import { useCallback, useEffect, useState } from "react";
import { useOpenCodeSession } from "../hooks/use-opencode-session";
import { OpenCodeSession, OpenCodeSessionCompact } from "./session-renderer";
import { truncateText } from "../syntax";

export interface OpenCodeViewerProps {
	client: OpencodeClient;
	sessionId?: string;
	compact?: boolean;
}

export function OpenCodeViewer({
	client,
	sessionId,
	compact = false,
}: OpenCodeViewerProps) {
	const instance = useInstance();
	const [expanded, setExpanded] = useState(!compact);

	const [activeSessionId, setActiveSessionId] = useState(sessionId);

	const {
		session,
		messages,
		parts,
		todos,
		status,
		error,
		setSessionId,
		abort,
		share,
		compact: compactSession,
		sendMessage,
	} = useOpenCodeSession({
		client,
		sessionId: activeSessionId,
	});

	const handleSwitchSession = (newSessionId: string) => {
		setActiveSessionId(newSessionId);
		setSessionId(newSessionId);
	};

	if (error) {
		return (
			<>
				<Container accentColor={0xed4245}>
					<TextDisplay>**Error**</TextDisplay>
					<TextDisplay>{error.message}</TextDisplay>
				</Container>
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

	if (!session) {
		return (
			<Container accentColor={0x5865f2}>
				<Loading message="Loading OpenCode session..." />
			</Container>
		);
	}

	if (!expanded) {
		return (
			<OpenCodeSessionCompact
				session={session}
				status={status}
				lastMessage={messages[messages.length - 1]}
				todos={todos}
				onExpand={() => setExpanded(true)}
			/>
		);
	}

	return (
		<OpenCodeSession
			client={client}
			session={session}
			messages={messages}
			parts={parts}
			todos={todos}
			status={status}
			onAbort={abort}
			onShare={share}
			onCompact={compactSession}
			onSwitchSession={handleSwitchSession}
			onSendMessage={sendMessage}
		/>
	);
}

const LOGO_LEFT = [
	`                   `,
	`█▀▀█ █▀▀█ █▀▀█ █▀▀▄`,
	`█░░█ █░░█ █▀▀▀ █░░█`,
	`▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀`,
];
const LOGO_RIGHT = [
	`             ▄     `,
	`█▀▀▀ █▀▀█ █▀▀█ █▀▀█`,
	`█░░░ █░░█ █░░█ █▀▀▀`,
	`▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀`,
];
const OPENCODE_LOGO = `\`\`\`
${LOGO_LEFT[0]} ${LOGO_RIGHT[0]}
${LOGO_LEFT[1]} ${LOGO_RIGHT[1]}
${LOGO_LEFT[2]} ${LOGO_RIGHT[2]}
${LOGO_LEFT[3]} ${LOGO_RIGHT[3]}
\`\`\``;

const DEFAULT_REPO = "/root/repos/opencode";

export interface OpenCodeNewSessionProps {
	client: OpencodeClient;
	serverUrl: string;
	initialPrompt?: string;
	agent?: string;
}

export function OpenCodeNewSession({
	client: initialClient,
	serverUrl,
	initialPrompt,
	agent,
}: OpenCodeNewSessionProps) {
	const instance = useInstance();
	const [activeClient, setActiveClient] = useState(initialClient);
	const [showSessionPicker, setShowSessionPicker] = useState(false);
	const [sessions, setSessions] = useState<Session[] | null>(null);

	useEffect(() => {
		if (showSessionPicker && !sessions) {
			activeClient.session.list().then((res) => {
				if (res.data) {
					setSessions(res.data.slice(0, 10));
				}
			});
		}
	}, [showSessionPicker, sessions, activeClient]);

	const {
		session,
		messages,
		parts,
		todos,
		status,
		setSessionId,
		sendMessage,
		abort,
		share,
	} = useOpenCodeSession({ client: activeClient });

	const handleSubmit = async (
		values: ModalFieldValues,
		interaction: ModalSubmitInteraction,
	) => {
		const prompt = values.getTextInput("prompt");
		const repoValues = values.getStringSelect("repo");
		const modelValues = values.getStringSelect("model");
		const agentValues = values.getStringSelect("agent");
		const repoPath = repoValues?.[0] ?? DEFAULT_REPO;
		const modelStr = modelValues?.[0];
		const selectedAgent = agentValues?.[0] ?? agent;
		const model = modelStr
			? {
					providerID: modelStr.split("/")[0]!,
					modelID: modelStr.split("/")[1]!,
				}
			: undefined;

		if (prompt) {
			await interaction.deferUpdate();
			const clientForRepo = createOpencodeClient({
				baseUrl: serverUrl,
				directory: repoPath,
			});
			setActiveClient(clientForRepo);

			const response = await clientForRepo.session.create();
			if (response.error || !response.data) {
				return;
			}
			const newSessionId = response.data.id;
			setSessionId(newSessionId);

			await clientForRepo.session.prompt({
				path: { id: newSessionId },
				body: {
					parts: [{ type: "text", text: prompt }],
					agent: selectedAgent,
					model: model ?? {
						providerID: "anthropic",
						modelID: "claude-opus-4-5-20251101",
					},
					system:
						"Do not spawn subagents or use the Task tool. Complete all work directly yourself.",
				},
			});
		}
	};

	const promptFields = [
		{
			type: "textInput" as const,
			id: "prompt",
			label: "Prompt",
			style: "paragraph" as const,
			placeholder: "What would you like to build?",
			defaultValue: initialPrompt,
			required: true,
			minLength: 1,
			maxLength: 4000,
		},
		{
			type: "stringSelect" as const,
			id: "repo",
			label: "Repository",
			placeholder: "OpenCode",
			required: false,
			options: [
				{
					label: "OpenCode",
					value: "/root/repos/opencode",
					description: "OpenCode codebase",
				},
				{
					label: "AnswerOverflow",
					value: "/root/repos/answeroverflow",
					description: "AnswerOverflow monorepo",
				},
			],
		},
		{
			type: "stringSelect" as const,
			id: "model",
			label: "Model",
			placeholder: "Claude Opus 4.5",
			required: false,
			options: [
				{
					label: "Claude Opus 4.5",
					value: "anthropic/claude-opus-4-5-20251101",
				},
				{
					label: "Claude Sonnet 4",
					value: "anthropic/claude-sonnet-4-20250514",
				},
				{ label: "GPT-4o", value: "openai/gpt-4o" },
			],
		},
		{
			type: "stringSelect" as const,
			id: "agent",
			label: "Agent",
			placeholder: "Default",
			required: false,
			options: [
				{ label: "Code", value: "code", description: "Write and edit code" },
				{ label: "Plan", value: "plan", description: "Plan and architect" },
				{ label: "Ask", value: "ask", description: "Answer questions" },
			],
		},
	];

	if (session && messages.length > 0) {
		return (
			<OpenCodeSession
				client={activeClient}
				session={session}
				messages={messages}
				parts={parts}
				todos={todos}
				status={status}
				onAbort={abort}
				onShare={share}
				onSendMessage={sendMessage}
			/>
		);
	}

	const handleSwitchSession = (newSessionId: string) => {
		setSessionId(newSessionId);
		setShowSessionPicker(false);
	};

	return (
		<>
			<Container accentColor={0x2f3136}>
				<TextDisplay>{OPENCODE_LOGO}</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>_What would you like to build?_</TextDisplay>
			</Container>
			<ActionRow>
				<ModalButton
					label="Send Prompt"
					style="primary"
					modalTitle="Send Prompt"
					fields={promptFields}
					onSubmit={handleSubmit}
				/>
				<Button
					label="Switch"
					style="secondary"
					onClick={() => setShowSessionPicker(true)}
				/>
				<Button
					label="Close"
					style="secondary"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
			{showSessionPicker && (
				<ActionRow>
					{sessions ? (
						<Select
							placeholder="Select a session..."
							onSelect={(value, interaction) => {
								interaction.deferUpdate();
								handleSwitchSession(value);
							}}
						>
							{sessions.map((s) => (
								<Option
									key={s.id}
									value={s.id}
									label={truncateText(s.title || "Untitled", 35)}
								/>
							))}
						</Select>
					) : (
						<LoadingSelect placeholder="Loading sessions..." />
					)}
				</ActionRow>
			)}
		</>
	);
}

export interface OpenCodeSessionListProps {
	client: OpencodeClient;
	onSelectSession?: (sessionId: string) => void;
}

export function OpenCodeSessionList({
	client,
	onSelectSession,
}: OpenCodeSessionListProps) {
	const instance = useInstance();
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const loadSessions = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await client.session.list();
			if (response.error || !response.data) {
				throw new Error("Failed to load sessions");
			}
			setSessions(response.data.slice(0, 10));
		} catch (e) {
			setError(e instanceof Error ? e : new Error(String(e)));
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		loadSessions();
	}, [loadSessions]);

	if (selectedId) {
		return <OpenCodeViewer client={client} sessionId={selectedId} />;
	}

	if (loading) {
		return (
			<Container accentColor={0x5865f2}>
				<Loading message="Loading sessions..." />
			</Container>
		);
	}

	if (error) {
		return (
			<>
				<Container accentColor={0xed4245}>
					<TextDisplay>**Error loading sessions**</TextDisplay>
					<TextDisplay>{error.message}</TextDisplay>
				</Container>
				<ActionRow>
					<Button label="Retry" style="primary" onClick={loadSessions} />
					<Button
						label="Close"
						style="danger"
						onClick={() => instance.destroy()}
					/>
				</ActionRow>
			</>
		);
	}

	if (sessions.length === 0) {
		return (
			<>
				<Container accentColor={0x99aab5}>
					<TextDisplay>**No sessions found**</TextDisplay>
					<TextDisplay>Start a new OpenCode session to get going!</TextDisplay>
				</Container>
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

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>**Recent Sessions**</TextDisplay>
				<Separator spacing="small" />
				{sessions.map((session, i) => (
					<TextDisplay key={session.id}>
						{i + 1}. {session.title || "Untitled"} -{" "}
						{new Date(session.time.updated).toLocaleDateString()}
					</TextDisplay>
				))}
			</Container>
			<ActionRow>
				{sessions.slice(0, 5).map((session, i) => (
					<Button
						key={session.id}
						label={`${i + 1}`}
						style="secondary"
						onClick={() => {
							if (onSelectSession) {
								onSelectSession(session.id);
							} else {
								setSelectedId(session.id);
							}
						}}
					/>
				))}
			</ActionRow>
			<ActionRow>
				<Button label="Refresh" style="primary" onClick={loadSessions} />
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
