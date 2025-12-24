"use client";

import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useTenant } from "@packages/ui/components/tenant-context";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { Suspense } from "react";
import {
	getMCPServerName,
	MCPInstallForm,
} from "@/components/resources-sidebar";

function MCPInstallFormFallback() {
	return (
		<div className="space-y-4">
			<div>
				<label className="text-sm font-medium mb-1.5 block">Server URL</label>
				<Skeleton className="h-10 w-full" />
			</div>
			<div>
				<label className="text-sm font-medium mb-1.5 block">Installation</label>
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}

function MCPInstallFormWithTenant() {
	const tenant = useTenant();
	const mcpUrl = getTenantCanonicalUrl(tenant, "/mcp");
	const serverName = getMCPServerName(tenant);

	return <MCPInstallForm mcpUrl={mcpUrl} serverName={serverName} />;
}

export default function MCPPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<div className="text-center mb-12">
					<h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
						Give Your Agent Real-Time Knowledge
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Connect your AI coding assistant to live Discord community
						discussions. Get answers from real developers solving real problems,
						updated in real-time.
					</p>
				</div>

				<div className="space-y-8">
					<section className="bg-card border rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">Installation</h2>

						<Suspense fallback={<MCPInstallFormFallback />}>
							<MCPInstallFormWithTenant />
						</Suspense>
					</section>

					<section className="bg-card border rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">Available Tools</h2>
						<div className="space-y-4">
							<div className="border-b pb-4">
								<h3 className="font-mono text-sm font-medium text-primary">
									search_answeroverflow
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Search for answers across all indexed Discord communities.
									Filter by server or channel ID for targeted results.
								</p>
							</div>
							<div className="border-b pb-4">
								<h3 className="font-mono text-sm font-medium text-primary">
									search_servers
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Discover Discord servers indexed on Answer Overflow. Get
									server IDs to use for filtered searching.
								</p>
							</div>
							<div className="border-b pb-4">
								<h3 className="font-mono text-sm font-medium text-primary">
									get_thread_messages
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Retrieve all messages from a specific thread or discussion.
									Get the complete context of a conversation.
								</p>
							</div>
							<div>
								<h3 className="font-mono text-sm font-medium text-primary">
									find_similar_threads
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Find threads similar to a given thread. Useful for discovering
									related discussions and solutions.
								</p>
							</div>
						</div>
					</section>

					<section className="text-center text-sm text-muted-foreground">
						<p>
							Need help?{" "}
							<Link
								href="https://discord.answeroverflow.com"
								className="text-primary hover:underline"
							>
								Join our Discord
							</Link>{" "}
							or check out the{" "}
							<Link
								href="https://docs.answeroverflow.com"
								className="text-primary hover:underline"
							>
								documentation
							</Link>
							.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
