export type MCPProvider = {
	id: string;
	name: string;
	icon: string;
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
		icon: "https://claude.ai/favicon.ico",
		getRemoteConfig: (mcpUrl) => ({
			type: "command",
			description: "Run this command in your terminal:",
			content: `claude mcp add --transport http answeroverflow ${mcpUrl}`,
		}),
	},
	{
		id: "cursor",
		name: "Cursor",
		icon: "https://cursor.com/favicon.ico",
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
		icon: "https://code.visualstudio.com/assets/favicon.ico",
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
		icon: "https://windsurf.com/favicon.png",
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
		icon: "https://claude.ai/favicon.ico",
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
		icon: "https://opencode.ai/favicon-96x96.png",
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
		icon: "https://saoudrizwan.gallerycdn.vsassets.io/extensions/saoudrizwan/claude-dev/3.46.1/1766441409033/Microsoft.VisualStudio.Services.Icons.Default",
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
		icon: "https://amp.dev/static/img/favicon.png",
		getRemoteConfig: (mcpUrl) => ({
			type: "command",
			description: "Run this command in your terminal:",
			content: `amp mcp add answeroverflow ${mcpUrl}`,
		}),
	},
	{
		id: "zed",
		name: "Zed",
		icon: "https://zed.dev/favicon.ico",
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
		icon: "https://rooveterinaryinc.gallerycdn.vsassets.io/extensions/rooveterinaryinc/roo-cline/3.37.1/1766531704474/Microsoft.VisualStudio.Services.Icons.Default",
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
		icon: "https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030f37fce5f06a5fd3d7b3.png",
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
		icon: "https://github.githubassets.com/assets/copilot-logo-26f6a05d9d39.svg",
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
		icon: "https://www.jetbrains.com/favicon.ico",
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
		icon: "https://openai.com/favicon.ico",
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
		icon: "https://kilo.ai/favicon.ico",
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
