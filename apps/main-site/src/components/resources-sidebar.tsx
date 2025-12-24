"use client";

import { Button } from "@packages/ui/components/button";
import { Code } from "@packages/ui/components/code";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@packages/ui/components/dialog";
import { ModelContextProtocol } from "@packages/ui/components/icons/mcp";
import { Input } from "@packages/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { useTenant } from "@packages/ui/components/tenant-context";
import { cn } from "@packages/ui/lib/utils";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import { Check, Copy } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useState } from "react";
import { mcpProviders } from "./mcp-install-configs";

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

export function MCPServerResource() {
	const tenant = useTenant();
	const mcpUrl = getTenantCanonicalUrl(tenant, "/mcp");
	const [isOpen, setIsOpen] = useQueryState("mcp", parseAsBoolean);
	const [selectedProvider, setSelectedProvider] = useQueryState("provider", {
		defaultValue: "claude-code",
	});

	const provider = mcpProviders.find((p) => p.id === selectedProvider);
	const config = provider?.getRemoteConfig(mcpUrl);

	return (
		<Dialog open={isOpen ?? false} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors w-full",
						"text-muted-foreground hover:bg-muted/50 hover:text-foreground",
					)}
				>
					<ModelContextProtocol className="size-4 shrink-0 opacity-60" />
					<span className="truncate">MCP Server</span>
				</button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg overflow-hidden">
				<DialogHeader>
					<DialogTitle>MCP Server</DialogTitle>
					<DialogDescription>
						Connect your AI tools to this community's knowledge base via the
						Model Context Protocol (MCP).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 min-w-0">
					<div className="min-w-0">
						<label className="text-sm font-medium mb-1.5 block">
							Server URL
						</label>
						<div className="flex items-center gap-2 min-w-0">
							<Input
								value={mcpUrl}
								readOnly
								className="font-mono text-sm min-w-0"
							/>
							<CopyButton text={mcpUrl} />
						</div>
					</div>

					<div className="min-w-0">
						<label className="text-sm font-medium mb-1.5 block">
							Installation
						</label>
						<Select
							value={selectedProvider}
							onValueChange={setSelectedProvider}
						>
							<SelectTrigger className="w-full">
								{provider ? (
									<div className="flex items-center gap-2">
										<img
											src={provider.icon}
											alt=""
											className="size-4 rounded-sm"
										/>
										<span>{provider.name}</span>
									</div>
								) : (
									<SelectValue placeholder="Select your tool" />
								)}
							</SelectTrigger>
							<SelectContent>
								{mcpProviders.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										<div className="flex items-center gap-2">
											<img src={p.icon} alt="" className="size-4 rounded-sm" />
											<span>{p.name}</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{config && (
							<div className="mt-3">
								<p className="text-xs text-muted-foreground mb-2">
									{config.description}
								</p>
								<Code
									code={config.content}
									language={config.type === "json" ? "json" : "bash"}
								/>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function ResourcesSidebar({ className }: { className?: string }) {
	return (
		<div className={cn("text-left", className)}>
			<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-2">
				Resources
			</div>
			<nav className="space-y-0.5">
				<MCPServerResource />
			</nav>
		</div>
	);
}
