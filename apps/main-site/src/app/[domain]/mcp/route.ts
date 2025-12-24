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

	const handler = createMcpHandler(
		(server) => {
			server.registerTool(
				`search_${tenant.name?.toLowerCase().replace(/\s+/g, "_") ?? "community"}`,
				{
					title: `Search ${tenant.name}`,
					description: `Search for answers in the ${tenant.name} Discord community archive.\n\nUse this to find solutions to questions, library-specific issues, and community discussions.\n\nTips for effective searching:\n- Use specific error messages or function names\n- Filter by channelId to search within a specific channel`,
					inputSchema: z.object({
						query: z
							.string()
							.describe(
								"The search query - can be error messages, function names, concepts, etc.",
							),
						channelId: z
							.string()
							.optional()
							.describe("Filter results to a specific channel."),
						limit: z
							.number()
							.min(1)
							.max(25)
							.default(10)
							.optional()
							.describe(
								"Maximum number of results to return (1-25, default 10)",
							),
					}),
				},
				async ({ query, channelId, limit }) => {
					return searchAnswerOverflow(
						{ query, serverId, channelId, limit },
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
		{},
		{
			basePath: "/",
			maxDuration: 60,
		},
	);

	return handler(request);
}

export { handleRequest as GET, handleRequest as POST };
