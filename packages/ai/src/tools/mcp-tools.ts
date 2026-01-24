import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { Tool } from "ai";

export type MCPServerConfig = {
	name: string;
	url: string;
};

export type MCPConnectionResult = {
	serverName: string;
	tools: Record<string, Tool>;
	error?: string;
};

export type MCPToolsResult = {
	tools: Record<string, Tool>;
	connections: MCPConnectionResult[];
};

const MCP_CONNECTION_TIMEOUT = 10000;
const MCP_TOOL_PREFIX_SEPARATOR = "__";

function prefixToolName(serverName: string, toolName: string): string {
	const sanitizedServerName = serverName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");
	return `${sanitizedServerName}${MCP_TOOL_PREFIX_SEPARATOR}${toolName}`;
}

function prefixTools(
	tools: Record<string, Tool>,
	serverName: string,
): Record<string, Tool> {
	const prefixedTools: Record<string, Tool> = {};
	for (const [name, tool] of Object.entries(tools)) {
		const prefixedName = prefixToolName(serverName, name);
		prefixedTools[prefixedName] = {
			...tool,
			description: `[${serverName}] ${tool.description ?? ""}`,
		};
	}
	return prefixedTools;
}

async function connectToMCPServer(
	server: MCPServerConfig,
): Promise<{ client: MCPClient; tools: Record<string, Tool> }> {
	const client = await createMCPClient({
		transport: {
			type: "http",
			url: server.url,
		},
		name: `answeroverflow-chat-${server.name.replace(/[^a-z0-9]/gi, "-")}`,
		version: "1.0.0",
	});

	const tools = await client.tools();

	return { client, tools };
}

export async function createMCPToolsFromServers(
	servers: MCPServerConfig[],
): Promise<MCPToolsResult> {
	if (servers.length === 0) {
		return { tools: {}, connections: [] };
	}

	const connections: MCPConnectionResult[] = [];
	const allTools: Record<string, Tool> = {};

	const connectionPromises = servers.map(async (server) => {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() =>
					reject(
						new Error(`Connection timeout after ${MCP_CONNECTION_TIMEOUT}ms`),
					),
				MCP_CONNECTION_TIMEOUT,
			);
		});

		try {
			const { tools } = await Promise.race([
				connectToMCPServer(server),
				timeoutPromise,
			]);

			const prefixedTools = prefixTools(tools, server.name);

			return {
				serverName: server.name,
				tools: prefixedTools,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.warn(
				`Failed to connect to MCP server "${server.name}" (${server.url}): ${errorMessage}`,
			);
			return {
				serverName: server.name,
				tools: {},
				error: errorMessage,
			};
		}
	});

	const results = await Promise.allSettled(connectionPromises);

	for (const result of results) {
		if (result.status === "fulfilled") {
			connections.push(result.value);
			Object.assign(allTools, result.value.tools);
		}
	}

	return { tools: allTools, connections };
}

export function getMCPServerFromToolName(
	toolName: string,
): { serverName: string; originalToolName: string } | null {
	const separatorIndex = toolName.indexOf(MCP_TOOL_PREFIX_SEPARATOR);
	if (separatorIndex === -1) {
		return null;
	}
	return {
		serverName: toolName.slice(0, separatorIndex),
		originalToolName: toolName.slice(
			separatorIndex + MCP_TOOL_PREFIX_SEPARATOR.length,
		),
	};
}
