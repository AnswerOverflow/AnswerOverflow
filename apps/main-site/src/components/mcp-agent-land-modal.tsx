"use client";

import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import { Button } from "@packages/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@packages/ui/components/dialog";
import { useTenant } from "@packages/ui/components/tenant-context";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import {
	CopyButton,
	getMCPServerName,
	MCPInstallForm,
} from "./resources-sidebar";

const DISMISSED_STORAGE_KEY = "ao-mcp-agent-land-dismissed";

export function buildMCPAgentLandPrompt(args: {
	mcpUrl: string;
	serverName: string;
	threadTitle?: string | null;
}): string {
	const base = `Use the Answer Overflow MCP at ${args.mcpUrl} to search the ${args.serverName} Discord.`;
	if (args.threadTitle) {
		return `${base} I'm looking at: ${args.threadTitle}`;
	}
	return base;
}

export function MCPAgentLandModal({
	page,
	serverName,
	threadTitle,
}: {
	page: "thread" | "community";
	serverName: string;
	threadTitle?: string | null;
}) {
	const tenant = useTenant();
	const posthog = usePostHog();
	const mcpUrl = getTenantCanonicalUrl(tenant, "/mcp");
	const [mcpQueryOpen] = useQueryState("mcp", parseAsBoolean);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (localStorage.getItem(DISMISSED_STORAGE_KEY)) return;
		if (mcpQueryOpen) return;
		setOpen(true);
		trackEvent(
			"MCP Land Modal Shown",
			{ page, url: window.location.href },
			posthog,
		);
		// Only decide once on mount; the ?mcp dialog owns later opens.
	}, []);

	const dismiss = () => {
		setOpen(false);
		localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
		trackEvent("MCP Land Modal Dismissed", { page }, posthog);
	};

	const prompt = buildMCPAgentLandPrompt({ mcpUrl, serverName, threadTitle });

	const handlePromptCopy = () => {
		trackEvent("MCP Land Prompt Copy Click", { url: mcpUrl }, posthog);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) dismiss();
			}}
		>
			<DialogContent className="sm:max-w-lg overflow-hidden">
				<DialogHeader>
					<DialogTitle>Search Discord with your agent</DialogTitle>
					<DialogDescription>
						Point your agent at this community. It can search threads and pull
						answers.
					</DialogDescription>
				</DialogHeader>

				<div className="min-w-0">
					<label className="text-sm font-medium mb-1.5 block">
						Agent prompt
					</label>
					<div className="flex items-start gap-2 min-w-0">
						<pre className="flex-1 min-w-0 whitespace-pre-wrap break-words rounded-md border bg-muted/50 p-3 font-mono text-xs">
							{prompt}
						</pre>
						<CopyButton text={prompt} onCopy={handlePromptCopy} />
					</div>
				</div>

				<MCPInstallForm mcpUrl={mcpUrl} serverName={getMCPServerName(tenant)} />

				<DialogFooter className="sm:justify-between sm:items-center">
					<a
						href="https://www.answeroverflow.com/mcp/setup"
						className="text-xs text-muted-foreground hover:underline"
					>
						Full setup guide
					</a>
					<Button type="button" variant="outline" onClick={dismiss}>
						Not now
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
