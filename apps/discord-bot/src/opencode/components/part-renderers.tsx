import { Container, TextDisplay } from "@packages/reacord";
import type { Part, ToolPart } from "@opencode-ai/sdk";
import { formatToolName, truncateText } from "../syntax";

export interface PartListProps {
	parts: Part[];
}

export function PartList({ parts }: PartListProps) {
	const filteredParts = parts.filter((part) => {
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
	});

	return (
		<>
			{filteredParts.map((part) => (
				<CompactPartRenderer key={part.id} part={part} showToolOutput={false} />
			))}
		</>
	);
}

export interface CompactPartRendererProps {
	part: Part;
	showToolOutput?: boolean;
}

export function CompactPartRenderer({
	part,
	showToolOutput = false,
}: CompactPartRendererProps) {
	switch (part.type) {
		case "text": {
			if (!part.text.trim() || part.ignored) return null;
			return (
				<Container>
					<TextDisplay>{truncateText(part.text, 500)}</TextDisplay>
				</Container>
			);
		}
		case "reasoning": {
			if (!part.text.trim()) return null;
			return (
				<Container accentColor={0x9b59b6}>
					<TextDisplay>_💭 {truncateText(part.text, 200)}_</TextDisplay>
				</Container>
			);
		}
		case "tool": {
			return <ToolPartRenderer part={part} showOutput={showToolOutput} />;
		}
		case "file": {
			const filename = part.filename ?? part.url.split("/").pop() ?? "file";
			return (
				<Container>
					<TextDisplay>📄 **{filename}**</TextDisplay>
				</Container>
			);
		}
		case "subtask": {
			return (
				<Container accentColor={0xe67e22}>
					<TextDisplay>
						🔀 **Subtask:** {truncateText(part.description, 80)}
					</TextDisplay>
				</Container>
			);
		}
		case "retry": {
			return (
				<Container accentColor={0xe74c3c}>
					<TextDisplay>
						🔁 Retry #{part.attempt}:{" "}
						{truncateText(part.error.data.message, 80)}
					</TextDisplay>
				</Container>
			);
		}
		default:
			return null;
	}
}

const TOOL_COLORS = {
	pending: 0x95a5a6,
	running: 0x3498db,
	completed: 0x2ecc71,
	error: 0xe74c3c,
} as const;

interface ToolPartRendererProps {
	part: ToolPart;
	showOutput?: boolean;
}

function ToolPartRenderer({ part, showOutput = false }: ToolPartRendererProps) {
	const { state, tool } = part;
	const emoji =
		state.status === "pending"
			? "⏳"
			: state.status === "running"
				? "🔄"
				: state.status === "completed"
					? "✅"
					: "❌";

	const color = TOOL_COLORS[state.status] ?? TOOL_COLORS.pending;

	const title =
		state.status === "completed" || state.status === "running"
			? (state.title ?? formatToolName(tool))
			: formatToolName(tool);

	const isEditTool =
		tool === "edit" ||
		tool === "write" ||
		tool === "multi_edit" ||
		tool === "str_replace_editor";

	if (
		state.status === "completed" &&
		isEditTool &&
		state.output &&
		showOutput
	) {
		const diff = extractDiff(state.output);
		if (diff) {
			return (
				<Container accentColor={color}>
					<TextDisplay>
						{emoji} **{truncateText(title, 60)}**
					</TextDisplay>
					<TextDisplay>{formatDiffCodeBlock(diff)}</TextDisplay>
				</Container>
			);
		}
	}

	if (state.status === "completed" && state.output && showOutput) {
		return (
			<Container accentColor={color}>
				<TextDisplay>
					{emoji} **{truncateText(title, 60)}**
				</TextDisplay>
				<TextDisplay>```{formatOutput(state.output)}```</TextDisplay>
			</Container>
		);
	}

	if (state.status === "error" && state.error) {
		return (
			<Container accentColor={color}>
				<TextDisplay>
					{emoji} **{truncateText(title, 50)}**: _
					{truncateText(state.error, 100)}_
				</TextDisplay>
			</Container>
		);
	}

	if (state.status === "running") {
		const inputStr = JSON.stringify(state.input);
		const preview = truncateText(inputStr.replace(/\n/g, " "), 100);
		return (
			<Container accentColor={color}>
				<TextDisplay>
					{emoji} **{truncateText(title, 50)}** `{preview}`
				</TextDisplay>
			</Container>
		);
	}

	return (
		<Container accentColor={color}>
			<TextDisplay>
				{emoji} **{truncateText(title, 60)}**
			</TextDisplay>
		</Container>
	);
}

function formatOutput(output: string): string {
	const lines = output.split("\n");
	const maxLines = 10;
	const maxChars = 400;
	let result = lines.slice(0, maxLines).join("\n");
	if (lines.length > maxLines) {
		result += "\n...";
	}
	if (result.length > maxChars) {
		result = result.slice(0, maxChars) + "...";
	}
	return result;
}

function extractDiff(output: string): string | null {
	const lines = output.split("\n");
	const diffLines: string[] = [];
	let inDiff = false;

	for (const line of lines) {
		if (
			line.startsWith("@@") ||
			line.startsWith("---") ||
			line.startsWith("+++")
		) {
			inDiff = true;
		}
		if (inDiff) {
			diffLines.push(line);
		}
		if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
			if (!inDiff) {
				diffLines.push(line);
			}
		}
	}

	if (diffLines.length === 0) {
		const addedLines = lines.filter(
			(l) => l.startsWith("+") && !l.startsWith("+++"),
		);
		const removedLines = lines.filter(
			(l) => l.startsWith("-") && !l.startsWith("---"),
		);
		if (addedLines.length > 0 || removedLines.length > 0) {
			return [...removedLines, ...addedLines].slice(0, 8).join("\n");
		}
		return null;
	}

	return diffLines.slice(0, 8).join("\n");
}

function formatDiffCodeBlock(diff: string): string {
	const maxChars = 300;
	const truncated =
		diff.length > maxChars ? diff.slice(0, maxChars) + "\n..." : diff;
	return "```diff\n" + truncated + "\n```";
}
