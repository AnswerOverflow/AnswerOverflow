"use client";

import { Badge } from "@packages/ui/components/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@packages/ui/components/collapsible";
import { cn } from "@packages/ui/lib/utils";
import {
	type DynamicToolUIPart,
	getToolName,
	type InferToolOutput,
	type ToolUIPart,
} from "ai";
import type { LucideIcon } from "lucide-react";
import {
	CheckCircleIcon,
	ChevronRightIcon,
	CodeIcon,
	FileIcon,
	FileSearchIcon,
	FolderSearchIcon,
	Loader2Icon,
	MessageSquareIcon,
	SearchIcon,
	ServerIcon,
	TerminalIcon,
	XCircleIcon,
} from "lucide-react";
import type { AnswerOverflowTools } from "@/lib/mcp/tools";

type ToolState = ToolUIPart["state"] | DynamicToolUIPart["state"];
type Input = Record<string, string | undefined>;

type Output<K extends keyof AnswerOverflowTools> = InferToolOutput<
	AnswerOverflowTools[K]
>;

type ToolConfig = {
	icon: LucideIcon;
	summary: (i: Input, o?: unknown) => string;
	getResult: (o: unknown) => string | null;
};

const fileName = (p: string) => p.split("/").pop() ?? p;
const truncate = (s: string, n: number) =>
	s.length > n ? `${s.slice(0, n - 3)}...` : s;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function objectTool<T>(
	icon: LucideIcon,
	summary: (i: Input, o?: T) => string,
	result: (o: T) => string | null,
): ToolConfig {
	return {
		icon,
		summary: (i, o) => summary(i, o as T | undefined),
		getResult: (o) => (typeof o === "object" && o ? result(o as T) : null),
	};
}

function stringTool(
	icon: LucideIcon,
	summary: (i: Input, o?: string) => string,
	result: (o: string) => string | null,
): ToolConfig {
	return {
		icon,
		summary: (i, o) => summary(i, typeof o === "string" ? o : undefined),
		getResult: (o) => (typeof o === "string" ? result(o) : null),
	};
}

const tools: Record<string, ToolConfig> = {
	search_answeroverflow: objectTool<Output<"search_answeroverflow">>(
		SearchIcon,
		(i) =>
			i.query
				? `Searching: "${truncate(i.query, 50)}"${i.serverId ? " in server" : ""}`
				: "Searching...",
		(o) => plural(o.results.length, "result"),
	),
	search_servers: objectTool<Output<"search_servers">>(
		ServerIcon,
		(i) => (i.query ? `Finding servers: "${i.query}"` : "Listing servers"),
		(o) => plural(o.servers.length, "server"),
	),
	get_thread_messages: objectTool<Output<"get_thread_messages">>(
		MessageSquareIcon,
		(_i, o) =>
			o && "title" in o && o.title
				? `Reading "${truncate(o.title, 40)}"`
				: "Reading thread...",
		(o) => ("error" in o ? null : plural(o.messages.length, "message")),
	),
	find_similar_threads: objectTool<Output<"find_similar_threads">>(
		FileSearchIcon,
		(i) =>
			i.query
				? `Finding similar: "${truncate(i.query, 50)}"`
				: "Finding similar...",
		(o) => plural(o.threads.length, "thread"),
	),
	read: stringTool(
		FileIcon,
		(i) => (i.filePath ? `Reading ${fileName(i.filePath)}` : "Reading file..."),
		(o) => {
			const m = o.match(/total (\d+) lines/);
			return m ? `${m[1]} lines` : null;
		},
	),
	glob: stringTool(
		FolderSearchIcon,
		(i) => (i.pattern ? `Finding ${i.pattern}` : "Finding files..."),
		(o) => {
			const lines = o.split("\n").filter(Boolean);
			return lines[0] === "No files found"
				? "No files"
				: plural(lines.length, "file");
		},
	),
	grep: stringTool(
		FileSearchIcon,
		(i) =>
			i.pattern
				? `Searching: "${i.pattern}"${i.include ? ` in ${i.include}` : ""}`
				: "Searching...",
		(o) => {
			const m = o.match(/Found (\d+) matches/);
			if (m) return plural(Number(m[1]), "match").replace("matchs", "matches");
			return o.includes("No matches") ? "No matches" : null;
		},
	),
	bash: stringTool(
		TerminalIcon,
		(i) =>
			i.description ??
			(i.command ? truncate(i.command, 40) : "Running command..."),
		(o) =>
			o === "(no output)" ? "Done" : plural(o.split("\n").length, "line"),
	),
	write: stringTool(
		CodeIcon,
		(i) => (i.filePath ? `Writing ${fileName(i.filePath)}` : "Writing file..."),
		(o) => (o.includes("File written") ? "Done" : null),
	),
	edit: stringTool(
		CodeIcon,
		(i) => (i.filePath ? `Editing ${fileName(i.filePath)}` : "Editing file..."),
		(o) => (o.includes("File edited") ? "Done" : null),
	),
};

const defaultTool = (name: string): ToolConfig => ({
	icon: TerminalIcon,
	summary: () => name.replaceAll("_", " "),
	getResult: () => null,
});

function formatOutput(output: unknown): string {
	if (typeof output === "string") {
		return truncate(output, 2000);
	}
	if (typeof output === "object" && output !== null) {
		return truncate(JSON.stringify(output, null, 2), 2000);
	}
	return String(output);
}

interface ToolDisplayProps {
	toolName: string;
	input: unknown;
	output?: unknown;
	errorText?: string;
	state: ToolState;
}

export function ToolDisplay({
	toolName,
	input,
	output,
	errorText,
	state,
}: ToolDisplayProps) {
	const config = tools[toolName] ?? defaultTool(toolName);
	const Icon = config.icon;

	const isComplete =
		state === "output-available" ||
		state === "output-error" ||
		state === "output-denied";
	const hasError =
		state === "output-error" || state === "output-denied" || !!errorText;

	const resultSummary =
		isComplete && output !== undefined ? config.getResult(output) : null;

	return (
		<Collapsible>
			<CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors">
				<ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
				<span
					className={cn(
						"flex items-center justify-center size-5 rounded",
						hasError
							? "bg-red-500/10 text-red-500"
							: "bg-muted text-muted-foreground",
					)}
				>
					<Icon className="size-3.5" />
				</span>
				<span className="flex-1 truncate text-muted-foreground">
					{config.summary((input ?? {}) as Input, output)}
				</span>
				<span className="flex items-center gap-1.5">
					{resultSummary && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0 h-4 font-normal"
						>
							{resultSummary}
						</Badge>
					)}
					{state === "output-available" ? (
						<CheckCircleIcon className="size-3 text-green-500" />
					) : state === "output-error" || state === "output-denied" ? (
						<XCircleIcon className="size-3 text-red-500" />
					) : (
						<Loader2Icon className="size-3 animate-spin text-muted-foreground" />
					)}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="ml-7 mt-1 mb-2 rounded-md border bg-muted/30 p-2 text-xs">
					{hasError && errorText && (
						<div className="text-red-500 mb-2">{errorText}</div>
					)}
					{output !== undefined && output !== null && (
						<pre className="whitespace-pre-wrap break-all text-muted-foreground max-h-60 overflow-auto">
							{formatOutput(output)}
						</pre>
					)}
					{output === undefined && !errorText && (
						<span className="text-muted-foreground italic">Running...</span>
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function ToolPartDisplay({
	part,
}: {
	part: ToolUIPart | DynamicToolUIPart;
}) {
	return (
		<ToolDisplay
			toolName={getToolName(part)}
			input={part.input}
			output={part.output}
			errorText={part.errorText}
			state={part.state}
		/>
	);
}
