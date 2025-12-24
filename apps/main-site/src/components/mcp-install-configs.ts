export type MCPProvider = {
	id: string;
	name: string;
	getRemoteConfig: (mcpUrl: string) => {
		type: "command" | "json";
		description: string;
		content: string;
	};
};

export const mcpProviders: MCPProvider[] = [
	{
		id: "claude-code",
		name: "Claude Code",
		getRemoteConfig: (mcpUrl) => ({
			type: "command",
			description: "Run this command in your terminal:",
			content: `claude mcp add --transport http answeroverflow ${mcpUrl}`,
		}),
	},
	{
		id: "cursor",
		name: "Cursor",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to ~/.cursor/mcp.json:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							url: mcpUrl,
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "vscode",
		name: "VS Code",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to VS Code settings (MCP extension):",
			content: JSON.stringify(
				{
					mcp: {
						servers: {
							answeroverflow: {
								type: "http",
								url: mcpUrl,
							},
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "windsurf",
		name: "Windsurf",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to your Windsurf MCP config file:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							serverUrl: mcpUrl,
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "claude-desktop",
		name: "Claude Desktop",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description:
				"Open Claude Desktop Settings > Connectors > Add Custom Connector, or add to ~/Library/Application Support/Claude/claude_desktop_config.json:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							command: "npx",
							args: ["-y", "mcp-remote", mcpUrl],
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "opencode",
		name: "OpenCode",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to your OpenCode configuration file (opencode.json):",
			content: JSON.stringify(
				{
					mcp: {
						answeroverflow: {
							type: "remote",
							url: mcpUrl,
							enabled: true,
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "cline",
		name: "Cline",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description:
				"Open Cline > MCP Servers > Remote Servers > Edit Configuration:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							url: mcpUrl,
							type: "streamableHttp",
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "amp",
		name: "Amp",
		getRemoteConfig: (mcpUrl) => ({
			type: "command",
			description: "Run this command in your terminal:",
			content: `amp mcp add answeroverflow ${mcpUrl}`,
		}),
	},
	{
		id: "zed",
		name: "Zed",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to your Zed settings.json:",
			content: JSON.stringify(
				{
					context_servers: {
						answeroverflow: {
							source: "custom",
							command: "npx",
							args: ["-y", "mcp-remote", mcpUrl],
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "roo-code",
		name: "Roo Code",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to your Roo Code MCP configuration file:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							type: "streamable-http",
							url: mcpUrl,
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "gemini-cli",
		name: "Gemini CLI",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to ~/.gemini/settings.json:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							httpUrl: mcpUrl,
							headers: {
								Accept: "application/json, text/event-stream",
							},
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "copilot-coding-agent",
		name: "Copilot Coding Agent",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description:
				"Add to Repository > Settings > Copilot > Coding agent > MCP configuration:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							type: "http",
							url: mcpUrl,
							tools: ["search_answeroverflow", "get_thread_messages"],
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "jetbrains",
		name: "JetBrains AI Assistant",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description:
				"Go to Settings > Tools > AI Assistant > Model Context Protocol (MCP), click + Add, select 'As JSON':",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							command: "npx",
							args: ["-y", "mcp-remote", mcpUrl],
						},
					},
				},
				null,
				2,
			),
		}),
	},
	{
		id: "openai-codex",
		name: "OpenAI Codex",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description: "Add to your OpenAI Codex MCP server settings (TOML):",
			content: `[mcp_servers.answeroverflow]
url = "${mcpUrl}"`,
		}),
	},
	{
		id: "kilo-code",
		name: "Kilo Code",
		getRemoteConfig: (mcpUrl) => ({
			type: "json",
			description:
				"Open Settings > MCP Servers > Add Server, or add to .kilocode/mcp.json:",
			content: JSON.stringify(
				{
					mcpServers: {
						answeroverflow: {
							type: "streamable-http",
							url: mcpUrl,
							disabled: false,
						},
					},
				},
				null,
				2,
			),
		}),
	},
];
