import {
	ActionRow,
	Button,
	Container,
	LoadingSelect,
	ModalButton,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import type {
	AssistantMessage,
	Message,
	OpencodeClient,
	Part,
	Session,
	SessionStatus,
	Todo,
} from "@opencode-ai/sdk";
import { useEffect, useState, useMemo } from "react";
import { formatCost, truncateText } from "../syntax";
import { CompactPartRenderer } from "./part-renderers";

const COLORS = {
	idle: 0x99aab5,
	busy: 0x5865f2,
	retry: 0xff9800,
	error: 0xed4245,
	user: 0x5865f2,
	assistant: 0x57f287,
} as const;

export interface OpenCodeSessionProps {
	client: OpencodeClient;
	session: Session;
	messages: Message[];
	parts: Map<string, Part[]>;
	todos: Todo[];
	status: SessionStatus;
	onAbort?: () => void;
	onShare?: () => void;
	onCompact?: () => void;
	onSwitchSession?: (sessionId: string) => void;
	onSendMessage?: (
		content: string,
		agent?: string,
		model?: { providerID: string; modelID: string },
	) => void;
}

type ContentItem =
	| { type: "message-header"; message: Message; showHeader: boolean }
	| { type: "part"; part: Part; messageId: string };

const MAX_VISIBLE_ITEMS = 6;

function filterPart(part: Part): boolean {
	if (part.type === "step-start" || part.type === "step-finish") {
		return false;
	}
	if (part.type === "snapshot" || part.type === "patch") {
		return false;
	}
	if (part.type === "agent" || part.type === "compaction") {
		return false;
	}
	return true;
}

export function OpenCodeSession({
	client,
	session,
	messages,
	parts,
	todos,
	status,
	onAbort,
	onShare,
	onSwitchSession,
	onSendMessage,
}: OpenCodeSessionProps) {
	const instance = useInstance();
	const [showSessionPicker, setShowSessionPicker] = useState(false);
	const [sessions, setSessions] = useState<Session[] | null>(null);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [showToolOutput, setShowToolOutput] = useState(false);

	useEffect(() => {
		if (showSessionPicker && !sessions) {
			client.session.list().then((res) => {
				if (res.data) {
					setSessions(res.data.slice(0, 10));
				}
			});
		}
	}, [showSessionPicker, sessions, client]);

	const allItems = useMemo(() => {
		const items: ContentItem[] = [];
		let prevRole: "user" | "assistant" | null = null;
		for (const message of messages) {
			const showHeader = message.role !== prevRole;
			prevRole = message.role;
			items.push({ type: "message-header", message, showHeader });
			const messageParts = parts.get(message.id) ?? [];
			for (const part of messageParts) {
				if (filterPart(part)) {
					items.push({ type: "part", part, messageId: message.id });
				}
			}
		}
		return items;
	}, [messages, parts]);

	const totalItems = allItems.length;
	const endIndex = totalItems - scrollOffset;
	const startIndex = Math.max(0, endIndex - MAX_VISIBLE_ITEMS);
	const visibleItems = allItems.slice(startIndex, endIndex);

	const hiddenBefore = startIndex;
	const hiddenAfter = scrollOffset;

	const canScrollUp = hiddenBefore > 0;
	const canScrollDown = hiddenAfter > 0;

	const statusColor =
		status.type === "busy"
			? COLORS.busy
			: status.type === "retry"
				? COLORS.retry
				: COLORS.idle;

	const statusEmoji =
		status.type === "busy" ? "🔄" : status.type === "retry" ? "⏳" : "✅";

	const totalCost = messages
		.filter((m): m is AssistantMessage => m.role === "assistant")
		.reduce((sum, m) => sum + m.cost, 0);

	const activeTodos = todos.filter(
		(t) => t.status === "in_progress" || t.status === "pending",
	);

	return (
		<>
			<Container accentColor={statusColor}>
				<TextDisplay>
					{statusEmoji} **
					{truncateText(session.title || "OpenCode Session", 50)}**
				</TextDisplay>
				<TextDisplay>
					{formatCost(totalCost)} | {messages.length} msgs
				</TextDisplay>
				{activeTodos.slice(0, 3).map((todo) => (
					<TextDisplay key={todo.id}>
						{todo.status === "in_progress" ? "🔄" : "⬜"}{" "}
						{truncateText(todo.content || "Untitled task", 50)}
					</TextDisplay>
				))}
				{activeTodos.length > 3 && (
					<TextDisplay>_+{activeTodos.length - 3} more todos_</TextDisplay>
				)}
			</Container>

			{totalItems > MAX_VISIBLE_ITEMS && (
				<ActionRow>
					<Button
						label={`▲ Older (${hiddenBefore})`}
						style="secondary"
						disabled={!canScrollUp}
						onClick={() =>
							setScrollOffset(
								Math.min(totalItems - MAX_VISIBLE_ITEMS, scrollOffset + 6),
							)
						}
					/>
					<Button
						label={`▼ Newer (${hiddenAfter})`}
						style="secondary"
						disabled={!canScrollDown}
						onClick={() => setScrollOffset(Math.max(0, scrollOffset - 6))}
					/>
					{hiddenAfter > 0 && (
						<Button
							label="⬇ Latest"
							style="primary"
							onClick={() => setScrollOffset(0)}
						/>
					)}
				</ActionRow>
			)}

			<ContentRenderer items={visibleItems} showToolOutput={showToolOutput} />

			<Separator />

			<ActionRow>
				{onSendMessage && (
					<ModalButton
						label="Prompt"
						style="primary"
						modalTitle="Send Prompt"
						fields={[
							{
								type: "textInput",
								id: "prompt",
								label: "Prompt",
								style: "paragraph",
								placeholder: "Enter your prompt...",
								required: true,
								minLength: 1,
								maxLength: 4000,
							},
							{
								type: "stringSelect",
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
						]}
						onSubmit={async (values, interaction) => {
							const prompt = values.getTextInput("prompt");
							const modelValues = values.getStringSelect("model");
							const modelStr = modelValues?.[0];
							const model = modelStr
								? {
										providerID: modelStr.split("/")[0]!,
										modelID: modelStr.split("/")[1]!,
									}
								: undefined;
							if (prompt) {
								onSendMessage(prompt, undefined, model);
								await interaction.reply({ content: "Sent!", ephemeral: true });
							}
						}}
					/>
				)}
				{status.type === "busy" && onAbort && (
					<Button label="Stop" style="danger" onClick={onAbort} />
				)}
				{onSendMessage && (
					<ModalButton
						label="Create PR"
						style="secondary"
						modalTitle="Create Pull Request"
						fields={[
							{
								type: "textInput",
								id: "title",
								label: "Title",
								style: "short",
								placeholder: "PR title (optional)",
								required: false,
								maxLength: 100,
							},
							{
								type: "textInput",
								id: "description",
								label: "Description",
								style: "paragraph",
								placeholder: "PR description (optional)",
								required: false,
								maxLength: 2000,
							},
							{
								type: "stringSelect",
								id: "draft",
								label: "Draft",
								placeholder: "No",
								required: false,
								options: [
									{ label: "No", value: "false" },
									{ label: "Yes", value: "true" },
								],
							},
						]}
						onSubmit={async (values, interaction) => {
							const title = values.getTextInput("title");
							const description = values.getTextInput("description");
							const draftValues = values.getStringSelect("draft");
							const isDraft = draftValues?.[0] === "true";

							let prompt = "Create a pull request using the GitHub CLI (gh). ";
							if (title) {
								prompt += `Use this title: "${title}". `;
							}
							if (description) {
								prompt += `Use this description: "${description}". `;
							}
							if (isDraft) {
								prompt += "Make it a draft PR. ";
							}
							prompt +=
								"First check the git status and diff to understand the changes, then create the PR with an appropriate title and description based on the changes if not provided.";

							onSendMessage(prompt, undefined, undefined);
							await interaction.reply({
								content: "Creating PR...",
								ephemeral: true,
							});
						}}
					/>
				)}
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label={showToolOutput ? "Hide Tool Output" : "Show Tool Output"}
					style="secondary"
					onClick={() => setShowToolOutput(!showToolOutput)}
				/>
				{onSwitchSession && (
					<Button
						label="Switch Session"
						style="secondary"
						onClick={() => setShowSessionPicker(true)}
					/>
				)}
				{onShare && !session.share && (
					<Button label="Share" style="secondary" onClick={onShare} />
				)}
			</ActionRow>

			{showSessionPicker && (
				<ActionRow>
					{sessions ? (
						<Select
							placeholder="Select a session..."
							onSelect={(value, interaction) => {
								interaction.deferUpdate();
								setShowSessionPicker(false);
								onSwitchSession?.(value);
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

interface ContentRendererProps {
	items: ContentItem[];
	showToolOutput: boolean;
}

function formatModelName(modelID: string): string {
	return modelID
		.replace(/-\d{8}$/, "")
		.replace(/-/g, " ")
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function ContentRenderer({ items, showToolOutput }: ContentRendererProps) {
	return (
		<>
			{items.map((item, index) => {
				if (item.type === "message-header") {
					if (!item.showHeader) {
						return null;
					}
					const isUser = item.message.role === "user";
					const modelName =
						item.message.role === "assistant"
							? formatModelName(item.message.modelID)
							: null;
					const cost =
						item.message.role === "assistant" ? item.message.cost : 0;
					return (
						<Container
							key={`header-${item.message.id}`}
							accentColor={isUser ? COLORS.user : COLORS.assistant}
						>
							<TextDisplay>
								**{isUser ? "👤 User" : `🤖 ${modelName}`}**
								{!isUser && ` _${formatCost(cost)}_`}
							</TextDisplay>
						</Container>
					);
				}

				return (
					<CompactPartRenderer
						key={`part-${item.part.id}-${index}`}
						part={item.part}
						showToolOutput={showToolOutput}
					/>
				);
			})}
		</>
	);
}

export interface OpenCodeSessionCompactProps {
	session: Session;
	status: SessionStatus;
	lastMessage?: Message;
	todos: Todo[];
	onExpand?: () => void;
}

export function OpenCodeSessionCompact({
	session,
	status,
	todos,
	onExpand,
}: OpenCodeSessionCompactProps) {
	const statusEmoji =
		status.type === "busy" ? "🔄" : status.type === "retry" ? "⏳" : "✅";

	const inProgressTodo = todos.find((t) => t.status === "in_progress");

	return (
		<Container accentColor={status.type === "busy" ? COLORS.busy : COLORS.idle}>
			<TextDisplay>
				{statusEmoji} **{truncateText(session.title || "OpenCode Session", 40)}
				**
			</TextDisplay>
			{inProgressTodo && (
				<TextDisplay>
					_📋 {truncateText(inProgressTodo.content, 50)}_
				</TextDisplay>
			)}
			{onExpand && (
				<ActionRow>
					<Button label="Expand" style="secondary" onClick={onExpand} />
				</ActionRow>
			)}
		</Container>
	);
}
