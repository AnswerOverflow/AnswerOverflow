import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	registerFindSimilarThreadsTool,
	registerGetThreadMessagesTool,
	searchAnswerOverflow,
} from "@/lib/mcp/tools";
import { getTenantData } from "@/lib/tenant";

async function handleRequest(
	request: NextRequest,
	props: { params: Promise<{ domain: string }> },
) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);
	const tenantData = await getTenantData(domain);

	if (!tenantData) {
		return new Response("Not Found", { status: 404 });
	}

	const { tenant } = tenantData;
	const serverId = tenant.discordId?.toString();

	if (!serverId) {
		return new Response("Server not configured", { status: 404 });
	}

	const buildUrl = (path: string) =>
		getTenantCanonicalUrl(
			{ customDomain: tenant.customDomain, subpath: tenant.subpath },
			path,
		);

	const toolName =
		tenant.name?.toLowerCase().replace(/\s+/g, "_") ?? "community";

	const instructions = `This is the ${tenant.name} Discord community archive - a searchable collection of help channel conversations.

Use this to find solutions to ${tenant.name}-specific questions from real community discussions.

**Available tools:**
- search_${toolName}: Search for threads by keywords, error messages, or concepts
- get_thread_messages: Get the full conversation in a thread
- find_similar_threads: Find semantically related discussions

**Tips:**
- Use specific error messages or function names for best results
- Check if results have solutions before reading full threads`;

	const handler = createMcpHandler(
		(server) => {
			server.registerTool(
				`search_${toolName}`,
				{
					title: `Search ${tenant.name}`,
					description: `Search for answers in the ${tenant.name} Discord community archive.
					Use this to find solutions to questions, library-specific issues, and community discussions.
					Tips for effective searching:
					- Use specific error messages or function names`,
					inputSchema: {
						query: z
							.string()
							.describe(
								"The search query - can be error messages, function names, concepts, etc.",
							),
						limit: z
							.number()
							.min(1)
							.max(25)
							.default(10)
							.optional()
							.describe(
								"Maximum number of results to return (1-25, default 10)",
							),
					},
				},
				async ({ query, limit }) => {
					return searchAnswerOverflow(
						{ query, serverId, limit },
						buildUrl,
						false,
					);
				},
			);

			registerGetThreadMessagesTool(server, {
				buildUrl,
				serverId,
				includeServerInfo: false,
			});

			registerFindSimilarThreadsTool(server, {
				buildUrl,
				serverId,
				includeServerInfo: false,
			});
		},
		{ instructions },
		{
			basePath: "/",
			maxDuration: 60,
		},
	);

	return handler(request);
}

export { handleRequest as GET, handleRequest as POST };
