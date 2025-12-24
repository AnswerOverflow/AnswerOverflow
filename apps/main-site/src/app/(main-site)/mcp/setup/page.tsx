"use client";

import { Button } from "@packages/ui/components/button";
import { Code } from "@packages/ui/components/code";
import { Input } from "@packages/ui/components/input";
import { Link } from "@packages/ui/components/link";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { getBaseUrl } from "@packages/ui/utils/links";
import { Check, Copy } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { mcpProviders } from "@/components/mcp-install-configs";

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button
			type="button"
			size="icon"
			variant="outline"
			onClick={handleCopy}
			className="shrink-0"
		>
			{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
			<span className="sr-only">{copied ? "Copied" : "Copy"}</span>
		</Button>
	);
}

export default function MCPPage() {
	const mcpUrl = `${getBaseUrl()}/mcp`;
	const [selectedProvider, setSelectedProvider] = useQueryState(
		"provider",
		parseAsString.withDefault("claude-code"),
	);

	const provider = mcpProviders.find((p) => p.id === selectedProvider);
	const config = provider?.getRemoteConfig(mcpUrl);

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

						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium mb-1.5 block">
									Server URL
								</label>
								<div className="flex items-center gap-2">
									<Input
										value={mcpUrl}
										readOnly
										className="font-mono text-sm"
									/>
									<CopyButton text={mcpUrl} />
								</div>
							</div>

							<div>
								<label className="text-sm font-medium mb-1.5 block">
									Select Your Tool
								</label>
								<Select
									value={selectedProvider}
									onValueChange={setSelectedProvider}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select your tool" />
									</SelectTrigger>
									<SelectContent>
										{mcpProviders.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{config && (
								<div className="mt-4">
									<p className="text-sm text-muted-foreground mb-2">
										{config.description}
									</p>
									<Code
										code={config.content}
										language={config.type === "json" ? "json" : "bash"}
									/>
								</div>
							)}
						</div>
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
