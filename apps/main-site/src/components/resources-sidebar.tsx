"use client";

import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
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
import { TrackLink } from "@packages/ui/components/track-link";
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

export function CopyButton({
	text,
	onCopy,
}: {
	text: string;
	onCopy?: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		onCopy?.();
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
	const posthog = usePostHog();
	const [selectedProvider, setSelectedProvider] = useQueryState("provider", {
		defaultValue: "claude-code",
	});

	const provider = mcpProviders.find((p) => p.id === selectedProvider);
	const config = provider?.getRemoteConfig(mcpUrl, serverName);

	const handleProviderChange = (value: string) => {
		setSelectedProvider(value);
		trackEvent("MCP Provider Select", { provider: value }, posthog);
	};

	const handleInstallCopy = () => {
		trackEvent(
			"MCP Install Copy Click",
			{ provider: selectedProvider, url: mcpUrl },
			posthog,
		);
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
						onCopy={handleInstallCopy}
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
	const posthog = usePostHog();

	const handleUrlCopy = () => {
		trackEvent("MCP URL Copy Click", { url: mcpUrl }, posthog);
	};

	return (
		<div className="space-y-4 min-w-0">
			<div className="min-w-0">
				<label className="text-sm font-medium mb-1.5 block">Server URL</label>
				<div className="flex items-center gap-2 min-w-0">
					<Input
						value={mcpUrl}
						readOnly
						className="font-mono text-sm min-w-0"
					/>
					<CopyButton text={mcpUrl} onCopy={handleUrlCopy} />
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

type ImageSponsor = {
	type: "image";
	name: string;
	href: string;
	image: string;
	width: number;
	height: number;
};

type CarbonSponsor = {
	type: "carbon";
	name: string;
};

type Sponsor = ImageSponsor | CarbonSponsor;

const SPONSORS: Sponsor[] = [
	{
		type: "image",
		name: "plannotator",
		href: "https://plannotator.ai/?utm_source=www.answeroverflow.com",
		image:
			"https://cdn.answeroverflow.com/1486404878359335092/d2a528c0-128c-4c86-851b-1d5c9ba9e21c.jpeg",
		width: 400,
		height: 516,
	},
	{
		type: "image",
		name: "invent",
		href: "https://www.useinvent.com/?utm_source=www.answeroverflow.com",
		image:
			"https://cdn.answeroverflow.com/1486944608360337418/064d70bc-58a7-44fc-89b6-f63f8c01173b.png",
		width: 400,
		height: 400,
	},
	{
		type: "image",
		name: "morphllm",
		href: "https://www.morphllm.com/mcp?utm_source=www.answeroverflow.com",
		image:
			"https://cdn.answeroverflow.com/1486944590882799656/94455281-5ac3-4fa4-94c2-0f56335ca2aa.jpeg",
		width: 400,
		height: 400,
	},
	{
		type: "carbon",
		name: "carbon",
	},
];

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

function SponsoredContent({ sponsorIndex }: { sponsorIndex: number }) {
	const sponsor = SPONSORS[sponsorIndex % SPONSORS.length]!;
	return (
		<div>
			{sponsor.type === "image" && (
				<TrackLink
					href={sponsor.href}
					eventName="Sponsored Card Click"
					eventData={{ sponsor: sponsor.name }}
				>
					<Image
						src={sponsor.image}
						alt={sponsor.name}
						width={sponsor.width}
						height={sponsor.height}
						className="w-full h-auto rounded-xl"
					/>
				</TrackLink>
			)}
			{sponsor.type === "carbon" && <CarbonAd />}
		</div>
	);
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
	sponsorIndex,
}: {
	className?: string;
	sponsorUrl?: string | null;
	serverId?: string;
	bowieImageIndex?: number;
	sponsorIndex?: number;
}) {
	const tenant = useTenant();
	const isGitHubSponsor = sponsorUrl?.includes("github.com/sponsors");
	const sponsorLabel = isGitHubSponsor
		? "GitHub Sponsor"
		: "Support the project";
	const showBowieCard = serverId === SUPABASE_SERVER_ID;
	const showSponsored = !tenant && !showBowieCard;

	return (
		<div className={cn("text-left", className)}>
			{showSponsored && <SponsoredContent sponsorIndex={sponsorIndex ?? 0} />}
			{showBowieCard && <BowieSidebarCard imageIndex={bowieImageIndex ?? 0} />}
			<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide mb-2 mt-4">
				Resources
			</div>
			<nav className="space-y-0.5">
				<MCPServerResource />
				{sponsorUrl && (
					<TrackLink
						href={sponsorUrl}
						eventName="Sponsor Link Click"
						eventData={{
							url: sponsorUrl,
							type: isGitHubSponsor ? "github" : "other",
						}}
						className={cn(
							"flex items-center gap-2 py-1.5 rounded text-sm transition-colors w-full",
							"text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						<Heart className="size-4 shrink-0 opacity-60" />
						<span className="truncate">{sponsorLabel}</span>
					</TrackLink>
				)}
			</nav>
		</div>
	);
}
