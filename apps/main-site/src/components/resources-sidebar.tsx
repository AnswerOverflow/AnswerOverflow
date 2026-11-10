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
import { Link } from "@packages/ui/components/link";
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
import { Check, Copy, Heart } from "lucide-react";
import Image from "next/image";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { mcpProviders } from "./mcp-install-configs";

const SUPABASE_SERVER_ID = "839993398554656828";
const BOWIE_IMAGES = [
	"https://cdn.answeroverflow.com/1486155152824991834/HENwuuXX0AA6qkA.png",
	"https://cdn.answeroverflow.com/1486155153689149541/HENwuu2bgAADphV.png",
	"https://cdn.answeroverflow.com/1486155154444255485/HENwuoza8AA4s6Y.png",
	"https://cdn.answeroverflow.com/1486155058285379784/HENxNsRb0AAfnGN.png",
];

export function CopyButton({ text }: { text: string }) {
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

export function ProviderSelector({
	mcpUrl,
	serverName,
}: {
	mcpUrl: string;
	serverName: string;
}) {
	const [selectedProvider, setSelectedProvider] = useQueryState("provider", {
		defaultValue: "claude-code",
	});

	const provider = mcpProviders.find((p) => p.id === selectedProvider);
	const config = provider?.getRemoteConfig(mcpUrl, serverName);

	const handleProviderChange = (value: string) => {
		setSelectedProvider(value);
	};

	return (
		<div className="min-w-0">
			<label className="text-sm font-medium mb-1.5 block">Installation</label>
			<Select value={selectedProvider} onValueChange={handleProviderChange}>
				<SelectTrigger className="w-full">
					{provider ? (
						<div className="flex items-center gap-2">
							<img src={provider.icon} alt="" className="size-4 rounded-sm" />
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
	);
}

export function MCPInstallForm({
	mcpUrl,
	serverName,
}: {
	mcpUrl: string;
	serverName: string;
}) {
	return (
		<div className="space-y-4 min-w-0">
			<div className="min-w-0">
				<label className="text-sm font-medium mb-1.5 block">One command</label>
				<p className="text-xs text-muted-foreground mb-2">
					Adds the server to Claude Code, Cursor, Codex, and other agents:
				</p>
				<Code
					code={`npx add-mcp ${mcpUrl} --name ${serverName}`}
					language="bash"
				/>
			</div>

			<div className="min-w-0">
				<label className="text-sm font-medium mb-1.5 block">Server URL</label>
				<div className="flex items-center gap-2 min-w-0">
					<Input
						value={mcpUrl}
						readOnly
						className="font-mono text-sm min-w-0"
					/>
					<CopyButton text={mcpUrl} />
				</div>
			</div>

			<ProviderSelector mcpUrl={mcpUrl} serverName={serverName} />
		</div>
	);
}

export function getMCPServerName(tenant: ReturnType<typeof useTenant>) {
	if (tenant) {
		const slug = tenant.customDomain?.split(".")[0] ?? tenant.name;
		return `${slug.toLowerCase().replace(/\s+/g, "-")}-discord`;
	}
	return "answeroverflow";
}

export function MCPServerResource() {
	const tenant = useTenant();
	const mcpUrl = getTenantCanonicalUrl(tenant, "/mcp");
	const serverName = getMCPServerName(tenant);
	const [isOpen, setIsOpen] = useQueryState("mcp", parseAsBoolean);

	return (
		<Dialog open={isOpen ?? false} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2  py-1.5 rounded text-sm transition-colors w-full",
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

				<MCPInstallForm mcpUrl={mcpUrl} serverName={serverName} />
			</DialogContent>
		</Dialog>
	);
}

function CarbonAd() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const script = document.createElement("script");
		script.src =
			"//cdn.carbonads.com/carbon.js?serve=CWYIV53I&placement=wwwansweroverflowcom&format=cover";
		script.id = "_carbonads_js";
		script.async = true;
		container.appendChild(script);

		return () => {
			container.innerHTML = "";
		};
	}, []);

	return <div ref={containerRef} />;
}

function BowieSidebarCard({ imageIndex }: { imageIndex: number }) {
	return (
		<div className="mt-4">
			<Image
				src={BOWIE_IMAGES[imageIndex % BOWIE_IMAGES.length]!}
				alt="Bowie the Supabase Dog"
				width={400}
				height={400}
				className="aspect-square w-full object-cover object-center rounded-xl"
			/>
			<div className="pt-2">
				<div className="text-sm font-medium text-foreground/90">
					Bowie says hi
				</div>
			</div>
		</div>
	);
}

export function ResourcesSidebar({
	className,
	sponsorUrl,
	serverId,
	bowieImageIndex,
	showSponsor,
}: {
	className?: string;
	sponsorUrl?: string | null;
	serverId?: string;
	bowieImageIndex?: number;
	showSponsor?: boolean;
}) {
	const tenant = useTenant();
	const isGitHubSponsor = sponsorUrl?.includes("github.com/sponsors");
	const sponsorLabel = isGitHubSponsor
		? "GitHub Sponsor"
		: "Support the project";
	const showBowieCard = serverId === SUPABASE_SERVER_ID;
	const showCarbonAd = showSponsor && !tenant && !showBowieCard;

	return (
		<div className={cn("text-left", className)}>
			{showCarbonAd && <CarbonAd />}
			{showBowieCard && <BowieSidebarCard imageIndex={bowieImageIndex ?? 0} />}
			<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide mb-2 mt-4">
				Resources
			</div>
			<nav className="space-y-0.5">
				<MCPServerResource />
				{sponsorUrl && (
					<Link
						href={sponsorUrl}
						className={cn(
							"flex items-center gap-2 py-1.5 rounded text-sm transition-colors w-full",
							"text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						<Heart className="size-4 shrink-0 opacity-60" />
						<span className="truncate">{sponsorLabel}</span>
					</Link>
				)}
			</nav>
		</div>
	);
}
