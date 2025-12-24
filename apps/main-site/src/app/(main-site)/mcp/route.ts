import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
	registerFindSimilarThreadsTool,
	registerGetThreadMessagesTool,
	searchAnswerOverflow,
	searchServers,
} from "@/lib/mcp/tools";

const buildUrl = (path: string) => `https://www.answeroverflow.com${path}`;

const handler = createMcpHandler(
	(server) => {
		server.registerTool(
			"search_answeroverflow",
			{
				title: "Search Answer Overflow",
				description:
					"Search for answers on Answer Overflow - a searchable archive of Discord help channels.\n\nUse this to find solutions to programming questions, library-specific issues, and community discussions.\n\nTips for effective searching:\n- Use specific error messages or function names\n- Filter by serverId to search within a specific community (e.g., Effect Discord, Next.js Discord)\n- Use search_servers first to discover available communities and their IDs",
				inputSchema: z.object({
					query: z
						.string()
						.describe(
							"The search query - can be error messages, function names, concepts, etc.",
						),
					serverId: z
						.string()
						.optional()
						.describe(
							"Filter results to a specific Discord server. Use search_servers to find server IDs.",
						),
					channelId: z
						.string()
						.optional()
						.describe("Filter results to a specific channel within a server."),
					limit: z
						.number()
						.min(1)
						.max(25)
						.default(10)
						.optional()
						.describe("Maximum number of results to return (1-25, default 10)"),
				}),
			},
			async ({ query, serverId, channelId, limit }) => {
				return searchAnswerOverflow(
					{ query, serverId, channelId, limit },
					buildUrl,
					true,
				);
			},
		);

		server.registerTool(
			"search_servers",
			{
				title: "Search Discord Servers",
				description:
					"Search for Discord servers indexed on Answer Overflow by name.\n\nUse this to discover communities and get their server IDs for filtered searching.\nResults are sorted by member count (largest first).\n\nExamples:\n- 'Effect' to find the Effect Community Discord\n- 'React' to find React-related servers\n- 'Next' to find Next.js servers",
				inputSchema: z.object({
					query: z
						.string()
						.optional()
						.describe(
							"Search query to filter servers by name. Leave empty to list all servers.",
						),
					limit: z
						.number()
						.min(1)
						.max(100)
						.default(25)
						.optional()
						.describe(
							"Maximum number of servers to return (1-100, default 25)",
						),
				}),
			},
			async ({ query, limit }) => {
				return searchServers({ query, limit });
			},
		);

		registerGetThreadMessagesTool(server, {
			buildUrl,
			includeServerInfo: true,
		});

		registerFindSimilarThreadsTool(server, {
			buildUrl,
			includeServerInfo: true,
		});
	},
	{},
	{
		basePath: "/",
		maxDuration: 60,
	},
);

export { handler as GET, handler as POST };
