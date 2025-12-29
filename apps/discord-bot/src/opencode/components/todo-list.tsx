import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
} from "@packages/reacord";
import type { Todo } from "@opencode-ai/sdk";
import { useState } from "react";

type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TodoPriority = "high" | "medium" | "low";

const STATUS_EMOJI: Record<TodoStatus, string> = {
	pending: "⬜",
	in_progress: "🔄",
	completed: "✅",
	cancelled: "❌",
};

const PRIORITY_EMOJI: Record<TodoPriority, string> = {
	high: "🔴",
	medium: "🟡",
	low: "🟢",
};

const STATUS_COLORS: Record<TodoStatus, number> = {
	pending: 0x99aab5,
	in_progress: 0x5865f2,
	completed: 0x57f287,
	cancelled: 0xed4245,
};

export interface TodoListProps {
	todos: Todo[];
	sessionId?: string;
	onClose?: () => void;
}

export function TodoList({ todos, sessionId, onClose }: TodoListProps) {
	const [filter, setFilter] = useState<Todo["status"] | "all">("all");
	const [showCompleted, setShowCompleted] = useState(false);

	const filteredTodos = todos.filter((todo) => {
		if (filter !== "all" && todo.status !== filter) return false;
		if (!showCompleted && todo.status === "completed") return false;
		return true;
	});

	const inProgressTodos = todos.filter((t) => t.status === "in_progress");
	const pendingTodos = todos.filter((t) => t.status === "pending");
	const completedTodos = todos.filter((t) => t.status === "completed");
	const cancelledTodos = todos.filter((t) => t.status === "cancelled");

	const accentColor =
		inProgressTodos.length > 0
			? STATUS_COLORS.in_progress
			: pendingTodos.length > 0
				? STATUS_COLORS.pending
				: completedTodos.length > 0
					? STATUS_COLORS.completed
					: 0x99aab5;

	if (todos.length === 0) {
		return (
			<Container accentColor={0x99aab5}>
				<TextDisplay>**Todo List**</TextDisplay>
				<TextDisplay>_No tasks yet_</TextDisplay>
			</Container>
		);
	}

	return (
		<>
			<Container accentColor={accentColor}>
				<TextDisplay>**Todo List**</TextDisplay>
				<TextDisplay>
					{inProgressTodos.length} in progress | {pendingTodos.length} pending |{" "}
					{completedTodos.length} completed
					{cancelledTodos.length > 0 && ` | ${cancelledTodos.length} cancelled`}
				</TextDisplay>
				<Separator spacing="small" />
				{filteredTodos.map((todo) => (
					<TextDisplay key={todo.id}>
						{STATUS_EMOJI[todo.status as TodoStatus] ?? "⬜"}{" "}
						{PRIORITY_EMOJI[todo.priority as TodoPriority] ?? "⚪"}{" "}
						{todo.content}
					</TextDisplay>
				))}
				{filteredTodos.length === 0 && (
					<TextDisplay>_No tasks match filter_</TextDisplay>
				)}
			</Container>

			<ActionRow>
				<Button
					label="All"
					style={filter === "all" ? "primary" : "secondary"}
					onClick={() => setFilter("all")}
				/>
				<Button
					label="In Progress"
					style={filter === "in_progress" ? "primary" : "secondary"}
					onClick={() => setFilter("in_progress")}
				/>
				<Button
					label="Pending"
					style={filter === "pending" ? "primary" : "secondary"}
					onClick={() => setFilter("pending")}
				/>
				<Button
					label={showCompleted ? "Hide Done" : "Show Done"}
					style="secondary"
					onClick={() => setShowCompleted((s) => !s)}
				/>
			</ActionRow>

			{onClose && (
				<ActionRow>
					<Button label="Close" style="danger" onClick={onClose} />
				</ActionRow>
			)}
		</>
	);
}

export interface TodoProgressProps {
	todos: Todo[];
	compact?: boolean;
}

export function TodoProgress({ todos, compact = false }: TodoProgressProps) {
	if (todos.length === 0) return null;

	const completed = todos.filter((t) => t.status === "completed").length;
	const inProgress = todos.filter((t) => t.status === "in_progress");
	const total = todos.length;
	const percentage = Math.round((completed / total) * 100);

	const progressBar = createProgressBar(percentage);

	if (compact) {
		return (
			<TextDisplay>
				{progressBar} {completed}/{total}
				{inProgress.length > 0 && ` | Current: ${inProgress[0]?.content}`}
			</TextDisplay>
		);
	}

	return (
		<Container accentColor={percentage === 100 ? 0x57f287 : 0x5865f2}>
			<TextDisplay>
				**Progress:** {progressBar} {percentage}%
			</TextDisplay>
			{inProgress.length > 0 && (
				<TextDisplay>**Current:** {inProgress[0]?.content}</TextDisplay>
			)}
		</Container>
	);
}

function createProgressBar(percentage: number): string {
	const filled = Math.round(percentage / 10);
	const empty = 10 - filled;
	return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}
