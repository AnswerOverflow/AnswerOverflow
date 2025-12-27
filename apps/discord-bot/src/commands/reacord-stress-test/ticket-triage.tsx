import {
	ActionRow,
	Attachment,
	Button,
	Container,
	File,
	ModalButton,
	Option,
	Section,
	Select,
	Separator,
	TextDisplay,
	UserSelect,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

type Priority = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "awaiting_info" | "resolved" | "closed";

interface Ticket {
	id: string;
	title: string;
	description: string;
	priority: Priority;
	status: Status;
	assigneeId: string | null;
	createdAt: Date;
	attachmentName: string | null;
	attachmentContent: string | null;
	resolutionNotes: string | null;
}

const PRIORITY_COLORS: Record<Priority, number> = {
	low: 0x99aab5,
	medium: 0xfee75c,
	high: 0xf57731,
	critical: 0xed4245,
};

const PRIORITY_LABELS: Record<Priority, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical",
};

const STATUS_LABELS: Record<Status, string> = {
	open: "Open",
	in_progress: "In Progress",
	awaiting_info: "Awaiting Info",
	resolved: "Resolved",
	closed: "Closed",
};

const STATUS_EMOJI: Record<Status, string> = {
	open: "🔵",
	in_progress: "🟡",
	awaiting_info: "🟠",
	resolved: "🟢",
	closed: "⚫",
};

function generateTicketId() {
	return `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function generateInitialTickets(): Ticket[] {
	return [
		{
			id: generateTicketId(),
			title: "Bot not responding to commands",
			description:
				"Users report the bot doesn't respond to slash commands in #support channel. Started around 2 hours ago.",
			priority: "high",
			status: "open",
			assigneeId: null,
			createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			attachmentName: null,
			attachmentContent: null,
			resolutionNotes: null,
		},
		{
			id: generateTicketId(),
			title: "Database connection timeout",
			description:
				"Getting intermittent database connection timeouts during peak hours. Affects search functionality.",
			priority: "critical",
			status: "in_progress",
			assigneeId: null,
			createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
			attachmentName: null,
			attachmentContent: null,
			resolutionNotes: null,
		},
	];
}

interface TicketCardProps {
	ticket: Ticket;
	onUpdate: (updates: Partial<Ticket>) => void;
	onClose: (notes: string) => void;
	onDelete: () => void;
	expanded: boolean;
	onToggleExpand: () => void;
}

function TicketCard({
	ticket,
	onUpdate,
	onClose,
	onDelete,
	expanded,
	onToggleExpand,
}: TicketCardProps) {
	const timeAgo = getTimeAgo(ticket.createdAt);
	const isClosed = ticket.status === "closed" || ticket.status === "resolved";

	return (
		<>
			{ticket.attachmentName && ticket.attachmentContent && (
				<Attachment
					name={`${ticket.id}_${ticket.attachmentName}`}
					data={Buffer.from(ticket.attachmentContent, "utf-8")}
				/>
			)}

			<Container accentColor={PRIORITY_COLORS[ticket.priority]}>
				<Section
					accessory={{
						type: "button",
						label: expanded ? "Collapse" : "Expand",
						style: "secondary",
						onClick: onToggleExpand,
					}}
				>
					<TextDisplay>
						### {STATUS_EMOJI[ticket.status]} {ticket.title}
					</TextDisplay>
					<TextDisplay>
						`{ticket.id}` • {PRIORITY_LABELS[ticket.priority]} Priority •{" "}
						{STATUS_LABELS[ticket.status]} • {timeAgo}
					</TextDisplay>
				</Section>

				{expanded && (
					<>
						<Separator spacing="small" />
						<TextDisplay>{ticket.description}</TextDisplay>

						<Separator spacing="small" />
						<TextDisplay>
							**Assignee:**{" "}
							{ticket.assigneeId ? `<@${ticket.assigneeId}>` : "_Unassigned_"}
						</TextDisplay>

						{ticket.attachmentName && ticket.attachmentContent && (
							<>
								<Separator spacing="small" />
								<TextDisplay>**Attachment:**</TextDisplay>
							</>
						)}
					</>
				)}

				{expanded && ticket.resolutionNotes && (
					<>
						<Separator spacing="small" />
						<TextDisplay>**Resolution:** {ticket.resolutionNotes}</TextDisplay>
					</>
				)}
			</Container>

			{expanded && ticket.attachmentName && ticket.attachmentContent && (
				<File url={`attachment://${ticket.id}_${ticket.attachmentName}`} />
			)}

			{expanded && !isClosed && (
				<>
					<UserSelect
						placeholder="Assign to..."
						onSelect={(userId) => {
							onUpdate({ assigneeId: userId });
						}}
					/>

					<Select
						placeholder="Set Priority"
						value={ticket.priority}
						onSelect={(value) => {
							onUpdate({ priority: value as Priority });
						}}
					>
						<Option value="low" label={PRIORITY_LABELS.low} />
						<Option value="medium" label={PRIORITY_LABELS.medium} />
						<Option value="high" label={PRIORITY_LABELS.high} />
						<Option value="critical" label={PRIORITY_LABELS.critical} />
					</Select>
					<Select
						placeholder="Set Status"
						value={ticket.status}
						onSelect={(value) => {
							if (value !== "closed" && value !== "resolved") {
								onUpdate({ status: value as Status });
							}
						}}
					>
						<Option
							value="open"
							label={`${STATUS_EMOJI.open} ${STATUS_LABELS.open}`}
						/>
						<Option
							value="in_progress"
							label={`${STATUS_EMOJI.in_progress} ${STATUS_LABELS.in_progress}`}
						/>
						<Option
							value="awaiting_info"
							label={`${STATUS_EMOJI.awaiting_info} ${STATUS_LABELS.awaiting_info}`}
						/>
					</Select>

					<ActionRow>
						<ModalButton
							label="Resolve"
							style="success"
							modalTitle="Resolve Ticket"
							fields={[
								{
									type: "textDisplay",
									content: `Closing ticket **${ticket.id}**: ${ticket.title}`,
								},
								{
									type: "textInput",
									id: "notes",
									label: "Resolution Notes",
									style: "paragraph",
									placeholder: "Describe how the issue was resolved...",
									required: true,
									maxLength: 1000,
								},
							]}
							onSubmit={(values) => {
								const notes = values.getTextInput("notes");
								if (notes) {
									onClose(notes);
								}
							}}
						/>
						<Button label="Delete" style="danger" onClick={onDelete} />
					</ActionRow>
				</>
			)}
		</>
	);
}

function getTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function TicketTriageScenario() {
	const instance = useInstance();
	const [tickets, setTickets] = useState<Ticket[]>(generateInitialTickets);
	const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
	const [filter, setFilter] = useState<
		"all" | "open" | "assigned" | "critical"
	>("all");

	const filteredTickets = tickets.filter((t) => {
		if (filter === "open")
			return t.status !== "closed" && t.status !== "resolved";
		if (filter === "assigned") return t.assigneeId !== null;
		if (filter === "critical") return t.priority === "critical";
		return true;
	});

	const openCount = tickets.filter(
		(t) => t.status !== "closed" && t.status !== "resolved",
	).length;
	const criticalCount = tickets.filter((t) => t.priority === "critical").length;

	const updateTicket = (id: string, updates: Partial<Ticket>) => {
		setTickets((prev) =>
			prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
		);
	};

	const closeTicket = (id: string, notes: string) => {
		setTickets((prev) =>
			prev.map((t) =>
				t.id === id
					? { ...t, status: "resolved" as Status, resolutionNotes: notes }
					: t,
			),
		);
		setExpandedTicketId(null);
	};

	const deleteTicket = (id: string) => {
		setTickets((prev) => prev.filter((t) => t.id !== id));
		if (expandedTicketId === id) {
			setExpandedTicketId(null);
		}
	};

	const createTicket = (title: string, description: string) => {
		const newTicket: Ticket = {
			id: generateTicketId(),
			title,
			description,
			priority: "medium",
			status: "open",
			assigneeId: null,
			createdAt: new Date(),
			attachmentName: null,
			attachmentContent: null,
			resolutionNotes: null,
		};
		setTickets((prev) => [newTicket, ...prev]);
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## Ticket Triage Board</TextDisplay>
				<TextDisplay>
					**{openCount}** open tickets • **{criticalCount}** critical
				</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>
					A real-time ticket management system. Assign users, set priorities,
					resolve tickets with notes, and manage attachments.
				</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label={`All (${tickets.length})`}
					style={filter === "all" ? "primary" : "secondary"}
					onClick={() => setFilter("all")}
				/>
				<Button
					label={`Open (${openCount})`}
					style={filter === "open" ? "primary" : "secondary"}
					onClick={() => setFilter("open")}
				/>
				<Button
					label="Assigned"
					style={filter === "assigned" ? "primary" : "secondary"}
					onClick={() => setFilter("assigned")}
				/>
				<Button
					label={`Critical (${criticalCount})`}
					style={filter === "critical" ? "danger" : "secondary"}
					onClick={() => setFilter("critical")}
				/>
			</ActionRow>

			<ActionRow>
				<ModalButton
					label="New Ticket"
					style="success"
					modalTitle="Create New Ticket"
					fields={[
						{
							type: "textInput",
							id: "title",
							label: "Title",
							style: "short",
							placeholder: "Brief summary of the issue...",
							required: true,
							maxLength: 100,
						},
						{
							type: "textInput",
							id: "description",
							label: "Description",
							style: "paragraph",
							placeholder: "Detailed description of the issue...",
							required: true,
							maxLength: 2000,
						},
					]}
					onSubmit={(values) => {
						const title = values.getTextInput("title");
						const description = values.getTextInput("description");
						if (title && description) {
							createTicket(title, description);
						}
					}}
				/>
				<Button
					label="Close Dashboard"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>

			<Separator />

			{filteredTickets.length === 0 ? (
				<Container accentColor={0x99aab5}>
					<TextDisplay>
						No tickets match the current filter. Try a different filter or
						create a new ticket.
					</TextDisplay>
				</Container>
			) : (
				filteredTickets.map((ticket) => (
					<TicketCard
						key={ticket.id}
						ticket={ticket}
						expanded={expandedTicketId === ticket.id}
						onToggleExpand={() =>
							setExpandedTicketId(
								expandedTicketId === ticket.id ? null : ticket.id,
							)
						}
						onUpdate={(updates) => updateTicket(ticket.id, updates)}
						onClose={(notes) => closeTicket(ticket.id, notes)}
						onDelete={() => deleteTicket(ticket.id)}
					/>
				))
			)}
		</>
	);
}
