import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "MCP Server Setup - Answer Overflow",
	description:
		"Connect your AI coding tools to Answer Overflow using the Model Context Protocol (MCP). Search Discord community discussions directly from Claude Code, Cursor, VS Code, and more.",
	openGraph: {
		title: "MCP Server Setup - Answer Overflow",
		description:
			"Connect your AI coding tools to Answer Overflow using the Model Context Protocol (MCP). Search Discord community discussions directly from Claude Code, Cursor, VS Code, and more.",
	},
};

export default function MCPLayout({ children }: { children: React.ReactNode }) {
	return children;
}
