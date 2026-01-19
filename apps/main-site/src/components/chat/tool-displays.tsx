"use client";

import { Badge } from "@packages/ui/components/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@packages/ui/components/collapsible";
import { cn } from "@packages/ui/lib/utils";
import { type DynamicToolUIPart, getToolName, type ToolUIPart } from "ai";
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
import type { ReactNode } from "react";

type ToolState = ToolUIPart["state"] | DynamicToolUIPart["state"];

type BaseToolInput = Record<string, unknown>;

interface SearchAnswerOverflowInput extends BaseToolInput {
	query: string;
	serverId?: string;
	limit?: number;
}

interface SearchServersInput extends BaseToolInput {
	query?: string;
	limit?: number;
}

interface GetThreadMessagesInput extends BaseToolInput {
	threadId: string;
	limit?: number;
}

interface FindSimilarThreadsInput extends BaseToolInput {
	query: string;
	serverId?: string;
	limit?: number;
}

interface SandboxReadInput extends BaseToolInput {
	filePath: string;
	offset?: number;
	limit?: number;
}

interface SandboxGlobInput extends BaseToolInput {
	pattern: string;
	path?: string;
}

interface SandboxGrepInput extends BaseToolInput {
	pattern: string;
	path?: string;
	include?: string;
}

interface SandboxBashInput extends BaseToolInput {
	command: string;
	description?: string;
}

interface SandboxWriteInput extends BaseToolInput {
	filePath: string;
	content: string;
}

interface SandboxEditInput extends BaseToolInput {
	filePath: string;
	oldString: string;
	newString: string;
	replaceAll?: boolean;
}

function getToolIcon(toolName: string): ReactNode {
	switch (toolName) {
		case "search_answeroverflow":
			return <SearchIcon className="size-3.5" />;
		case "search_servers":
			return <ServerIcon className="size-3.5" />;
		case "get_thread_messages":
			return <MessageSquareIcon className="size-3.5" />;
		case "find_similar_threads":
			return <FileSearchIcon className="size-3.5" />;
		case "read":
			return <FileIcon className="size-3.5" />;
		case "glob":
			return <FolderSearchIcon className="size-3.5" />;
		case "grep":
			return <FileSearchIcon className="size-3.5" />;
		case "bash":
			return <TerminalIcon className="size-3.5" />;
		case "write":
		case "edit":
			return <CodeIcon className="size-3.5" />;
		default:
			return <TerminalIcon className="size-3.5" />;
	}
}

function getStatusIndicator(state: ToolState): ReactNode {
	switch (state) {
		case "input-streaming":
		case "input-available":
			return (
				<Loader2Icon className="size-3 animate-spin text-muted-foreground" />
			);
		case "output-available":
			return <CheckCircleIcon className="size-3 text-green-500" />;
		case "output-error":
		case "output-denied":
			return <XCircleIcon className="size-3 text-red-500" />;
		default:
			return (
				<Loader2Icon className="size-3 animate-spin text-muted-foreground" />
			);
	}
}

function formatToolSummary(toolName: string, input: BaseToolInput): string {
	switch (toolName) {
		case "search_answeroverflow": {
			const typedInput = input as SearchAnswerOverflowInput;
			return `Searching: "${typedInput.query}"${typedInput.serverId ? ` in server` : ""}`;
		}
		case "search_servers": {
			const typedInput = input as SearchServersInput;
			return typedInput.query
				? `Finding servers: "${typedInput.query}"`
				: "Listing servers";
		}
		case "get_thread_messages": {
			const typedInput = input as GetThreadMessagesInput;
			return `Loading thread ${typedInput.threadId.slice(-6)}...`;
		}
		case "find_similar_threads": {
			const typedInput = input as FindSimilarThreadsInput;
			return `Finding similar: "${typedInput.query}"`;
		}
		case "read": {
			const typedInput = input as SandboxReadInput;
			const fileName =
				typedInput.filePath.split("/").pop() ?? typedInput.filePath;
			return `Reading ${fileName}`;
		}
		case "glob": {
			const typedInput = input as SandboxGlobInput;
			return `Finding ${typedInput.pattern}`;
		}
		case "grep": {
			const typedInput = input as SandboxGrepInput;
			return `Searching: "${typedInput.pattern}"${typedInput.include ? ` in ${typedInput.include}` : ""}`;
		}
		case "bash": {
			const typedInput = input as SandboxBashInput;
			if (typedInput.description) {
				return typedInput.description;
			}
			const cmd = typedInput.command;
			if (cmd.length > 40) {
				return `${cmd.slice(0, 37)}...`;
			}
			return cmd;
		}
		case "write": {
			const typedInput = input as SandboxWriteInput;
			const fileName =
				typedInput.filePath.split("/").pop() ?? typedInput.filePath;
			return `Writing ${fileName}`;
		}
		case "edit": {
			const typedInput = input as SandboxEditInput;
			const fileName =
				typedInput.filePath.split("/").pop() ?? typedInput.filePath;
			return `Editing ${fileName}`;
		}
		default:
			return toolName.replace(/_/g, " ");
	}
}

function formatResultSummary(toolName: string, output: unknown): string | null {
	if (!output || typeof output !== "string") return null;

	try {
		if (toolName === "search_answeroverflow") {
			const parsed = JSON.parse(output);
			if (parsed.results) {
				return `${parsed.results.length} result${parsed.results.length === 1 ? "" : "s"}`;
			}
		}
		if (toolName === "search_servers") {
			const parsed = JSON.parse(output);
			if (parsed.servers) {
				return `${parsed.servers.length} server${parsed.servers.length === 1 ? "" : "s"}`;
			}
		}
		if (toolName === "get_thread_messages") {
			const parsed = JSON.parse(output);
			if (parsed.messages) {
				return `${parsed.messages.length} message${parsed.messages.length === 1 ? "" : "s"}`;
			}
		}
		if (toolName === "find_similar_threads") {
			const parsed = JSON.parse(output);
			if (parsed.threads) {
				return `${parsed.threads.length} thread${parsed.threads.length === 1 ? "" : "s"}`;
			}
		}
		if (toolName === "glob") {
			const lines = output.split("\n").filter(Boolean);
			if (lines[0] === "No files found") return "No files";
			return `${lines.length} file${lines.length === 1 ? "" : "s"}`;
		}
		if (toolName === "grep") {
			const match = output.match(/Found (\d+) matches/);
			if (match) return `${match[1]} match${match[1] === "1" ? "" : "es"}`;
			if (output.includes("No matches")) return "No matches";
		}
		if (toolName === "read") {
			const match = output.match(/total (\d+) lines/);
			if (match) return `${match[1]} lines`;
		}
		if (toolName === "bash") {
			if (output === "(no output)") return "Done";
			const lines = output.split("\n").length;
			return `${lines} line${lines === 1 ? "" : "s"}`;
		}
		if (toolName === "write" || toolName === "edit") {
			if (output.includes("File written") || output.includes("File edited")) {
				return "Done";
			}
		}
	} catch {}

	return null;
}

function formatOutput(output: unknown): string {
	if (typeof output === "string") {
		return output.length > 2000 ? `${output.slice(0, 2000)}...` : output;
	}
	if (typeof output === "object" && output !== null) {
		const str = JSON.stringify(output, null, 2);
		return str.length > 2000 ? `${str.slice(0, 2000)}...` : str;
	}
	return String(output);
}

interface ToolDisplayProps {
	toolName: string;
	input: BaseToolInput;
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
	const isComplete =
		state === "output-available" ||
		state === "output-error" ||
		state === "output-denied";
	const hasError =
		state === "output-error" || state === "output-denied" || !!errorText;
	const summary = formatToolSummary(toolName, input);
	const resultSummary = isComplete
		? formatResultSummary(toolName, output)
		: null;

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
					{getToolIcon(toolName)}
				</span>
				<span className="flex-1 truncate text-muted-foreground">{summary}</span>
				<span className="flex items-center gap-1.5">
					{resultSummary && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0 h-4 font-normal"
						>
							{resultSummary}
						</Badge>
					)}
					{getStatusIndicator(state)}
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

interface ToolPartDisplayProps {
	part: ToolUIPart | DynamicToolUIPart;
}

export function ToolPartDisplay({ part }: ToolPartDisplayProps) {
	const toolName = getToolName(part);

	return (
		<ToolDisplay
			toolName={toolName}
			input={part.input as BaseToolInput}
			output={part.output as unknown}
			errorText={part.errorText}
			state={part.state}
		/>
	);
}
