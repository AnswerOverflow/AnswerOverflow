"use client";

import type { Server } from "@packages/database/convex/schema";
import { Link } from "@packages/ui/components/link";
import { LinkButton } from "@packages/ui/components/link-button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { cn } from "@packages/ui/lib/utils";
import {
	ArrowRight,
	BarChart3,
	Plus,
	Search,
	Sparkles,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type MousePosition = { x: number; y: number } | null;

function GlowCard({
	server,
	mousePosition,
}: {
	server: Server;
	mousePosition: MousePosition;
}) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [localPosition, setLocalPosition] = useState<{
		x: number;
		y: number;
		isNear: boolean;
	}>({ x: 0, y: 0, isNear: false });

	useEffect(() => {
		if (!mousePosition) {
			setLocalPosition((prev) => ({ ...prev, isNear: false }));
			return;
		}

		let animationFrameId: number;

		const updatePosition = () => {
			if (!cardRef.current || !mousePosition) return;

			const rect = cardRef.current.getBoundingClientRect();
			const x = mousePosition.x - rect.left;
			const y = mousePosition.y - rect.top;

			const isNear =
				x >= -100 &&
				x <= rect.width + 100 &&
				y >= -100 &&
				y <= rect.height + 100;

			setLocalPosition({ x, y, isNear });
			animationFrameId = requestAnimationFrame(updatePosition);
		};

		animationFrameId = requestAnimationFrame(updatePosition);

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [mousePosition]);

	return (
		<div
			ref={cardRef}
			className="relative w-48 rounded-lg transition-transform duration-300 hover:scale-105"
		>
			<div
				className="pointer-events-none absolute inset-0 z-10 rounded-lg transition-opacity duration-150 ease-out"
				style={{
					opacity: localPosition.isNear ? 1 : 0,
					background: `radial-gradient(100px circle at ${localPosition.x}px ${localPosition.y}px, rgba(56, 189, 248, 0.4), transparent 50%)`,
				}}
			/>
			<Link
				href={`/c/${server.discordId}`}
				className="relative flex w-full flex-col items-center rounded-lg border bg-card p-4 shadow-sm"
			>
				<ServerIcon server={server} size={48} />
				<span className="mt-2 text-center text-sm font-medium text-foreground line-clamp-1">
					{server.name}
				</span>
				<span className="text-xs text-muted-foreground">
					{formatMemberCount(server.approximateMemberCount)} members
				</span>
			</Link>
		</div>
	);
}

function GoogleMockup({ withAnswerOverflow }: { withAnswerOverflow: boolean }) {
	const searchQuery = "How do I fix the Discord bot not responding?";

	return (
		<div className="bg-white dark:bg-[#202124] h-[400px] text-left flex flex-col">
			<header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
				<div className="flex items-center gap-4 flex-1">
					<img
						src="/googlelogo.png"
						alt="Google"
						className="h-7 object-contain"
					/>
					<div className="flex items-center gap-3 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-full hover:shadow-md transition-shadow flex-1 bg-white dark:bg-[#303134]">
						<span className="flex-1 text-sm text-gray-900 dark:text-neutral-200 truncate">
							{searchQuery}
						</span>
						<Search className="w-5 h-5 text-blue-500" />
					</div>
				</div>
			</header>

			<div className="px-4 mt-4">
				<p className="text-sm text-gray-600 dark:text-neutral-400">
					{withAnswerOverflow
						? "About 2,340 results (0.42 seconds)"
						: "No results found"}
				</p>
			</div>

			<main className="px-4 mt-4 flex-1">
				{withAnswerOverflow ? (
					<div className="space-y-6">
						<article className="mb-6">
							<Link
								href="/m/1234567890"
								className="block hover:no-underline group"
							>
								<div className="flex items-start gap-3 mb-1">
									<div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
										<img src="/favicon.ico" alt="" className="w-4 h-4" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-0.5">
											<span className="text-sm text-gray-900 dark:text-neutral-200">
												answeroverflow.com
											</span>
										</div>
										<div className="text-xs text-gray-600 dark:text-neutral-400 mb-1">
											https://answeroverflow.com › discord-bot-help
										</div>
									</div>
								</div>
								<h3 className="text-xl text-blue-800 dark:text-[#8ab4f8] group-hover:underline cursor-pointer mb-1 ml-10">
									How do I fix the Discord bot not responding?
								</h3>
								<p className="text-sm text-gray-600 dark:text-neutral-400 leading-relaxed ml-10">
									Make sure your bot token is valid and the bot has the correct
									permissions. Check that MESSAGE_CONTENT intent is enabled in
									the Discord Developer Portal...
								</p>
							</Link>
						</article>

						<article className="mb-6">
							<Link
								href="/m/1234567891"
								className="block hover:no-underline group"
							>
								<div className="flex items-start gap-3 mb-1">
									<div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
										<img src="/favicon.ico" alt="" className="w-4 h-4" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-0.5">
											<span className="text-sm text-gray-900 dark:text-neutral-200">
												answeroverflow.com
											</span>
										</div>
										<div className="text-xs text-gray-600 dark:text-neutral-400 mb-1">
											https://answeroverflow.com › bot-troubleshooting
										</div>
									</div>
								</div>
								<h3 className="text-xl text-blue-800 dark:text-[#8ab4f8] group-hover:underline cursor-pointer mb-1 ml-10">
									Bot not responding to commands - Troubleshooting Guide
								</h3>
								<p className="text-sm text-gray-600 dark:text-neutral-400 leading-relaxed ml-10">
									Common issues include: missing intents, incorrect command
									prefix, bot is offline, or rate limiting. Here&apos;s how to
									debug each...
								</p>
							</Link>
						</article>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center flex-1 text-center">
						<Search className="h-16 w-16 text-gray-300 dark:text-neutral-600 mb-4" />
						<p className="text-gray-600 dark:text-neutral-400">
							No results found for &quot;{searchQuery}&quot;
						</p>
						<p className="text-sm text-gray-400 dark:text-neutral-500 mt-2">
							Your Discord discussions aren&apos;t indexed by Google
						</p>
					</div>
				)}
			</main>
		</div>
	);
}

function ChatGPTMockup({
	withAnswerOverflow,
}: {
	withAnswerOverflow: boolean;
}) {
	const userQuery = "How do I fix the Discord bot not responding?";

	return (
		<div className="bg-white dark:bg-[#212121] h-[400px] flex flex-col text-left">
			<div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
				<span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
					ChatGPT
				</span>
				<span className="text-sm text-neutral-500 dark:text-neutral-400">
					{" "}
					Thinking
				</span>
			</div>
			<div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
				<div className="flex justify-end">
					<div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-2xl px-4 py-2 max-w-[80%]">
						<p className="text-sm text-neutral-800 dark:text-white">
							{userQuery}
						</p>
					</div>
				</div>
				<div className="text-left space-y-3">
					<p className="text-xs text-neutral-500 dark:text-neutral-400">
						Thought for 12s &gt;
					</p>
					{withAnswerOverflow ? (
						<div className="text-sm text-neutral-800 dark:text-neutral-200 space-y-3 text-left">
							<p>Based on discussions from the Discord Bot Help community:</p>
							<ol className="list-decimal list-inside space-y-1.5 text-left">
								<li>
									Check that your bot token is valid and hasn&apos;t been
									regenerated
								</li>
								<li>
									Ensure MESSAGE_CONTENT intent is enabled in the Developer
									Portal
								</li>
								<li>Verify the bot has proper permissions in the server</li>
								<li>Check if the bot is online and not rate limited</li>
							</ol>
							<div className="mt-4 flex items-center gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs">
									<img src="/favicon.ico" alt="" className="h-4 w-4" />
									<span className="text-neutral-600 dark:text-neutral-400">
										Sources
									</span>
								</div>
								<Link
									href="/m/1234567890"
									className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
								>
									Discord Bot Help
								</Link>
								<Link
									href="/m/1234567891"
									className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
								>
									Bot Troubleshooting
								</Link>
							</div>
						</div>
					) : (
						<div className="text-sm text-neutral-800 dark:text-neutral-200 space-y-3 text-left">
							<p>
								I don&apos;t have specific information about your Discord bot
								setup. Here are some general suggestions:
							</p>
							<ul className="list-disc list-inside space-y-1.5 text-neutral-500 dark:text-neutral-400 text-left">
								<li>Check if your bot is online</li>
								<li>Verify your code for errors</li>
								<li>Review Discord&apos;s documentation</li>
							</ul>
							<p className="text-neutral-400 dark:text-neutral-500 italic">
								I don&apos;t have access to your community&apos;s specific
								discussions or solutions.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function HeroDemo() {
	const [withAnswerOverflow, setWithAnswerOverflow] = useState(true);
	const [activeTab, setActiveTab] = useState<"google" | "chatgpt">("google");

	return (
		<div className="mt-12 mx-auto max-w-2xl">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setActiveTab("google")}
						className={cn(
							"px-3 py-1.5 rounded-md text-sm font-medium transition-all",
							activeTab === "google"
								? "bg-neutral-100 dark:bg-neutral-800 text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Google
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("chatgpt")}
						className={cn(
							"px-3 py-1.5 rounded-md text-sm font-medium transition-all",
							activeTab === "chatgpt"
								? "bg-neutral-100 dark:bg-neutral-800 text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						ChatGPT
					</button>
				</div>
				<div className="flex items-center gap-1 p-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
					<button
						type="button"
						onClick={() => setWithAnswerOverflow(false)}
						className={cn(
							"px-3 py-1 rounded-full text-xs font-medium transition-all",
							!withAnswerOverflow
								? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Without
					</button>
					<button
						type="button"
						onClick={() => setWithAnswerOverflow(true)}
						className={cn(
							"px-3 py-1 rounded-full text-xs font-medium transition-all",
							withAnswerOverflow
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						With Answer Overflow
					</button>
				</div>
			</div>
			<div className="rounded-xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-700">
				{activeTab === "google" ? (
					<GoogleMockup withAnswerOverflow={withAnswerOverflow} />
				) : (
					<ChatGPTMockup withAnswerOverflow={withAnswerOverflow} />
				)}
			</div>
		</div>
	);
}

function HeroSection() {
	return (
		<section className="relative overflow-hidden py-20 sm:py-32">
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
			<div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
				<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
					Make Your <span className="text-[#5865F2]">Discord</span> Community{" "}
					<span className="text-primary">Discoverable</span>
				</h1>
				<HeroDemo />

				<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<LinkButton href="/dashboard" size="lg">
						Setup for Free
						<ArrowRight className="ml-2 h-4 w-4" />
					</LinkButton>
					<LinkButton href="/browse" variant="outline" size="lg">
						Browse Communities
					</LinkButton>
				</div>
			</div>
		</section>
	);
}

function FeatureCard({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof Search;
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
			<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
				<Icon className="h-6 w-6 text-primary" />
			</div>
			<h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function FeaturesSection() {
	const features = [
		{
			icon: Search,
			title: "Google Indexing",
			description:
				"Your Discord threads appear in Google search results, driving organic traffic to your community.",
		},
		{
			icon: Sparkles,
			title: "AI-Powered Answers",
			description:
				"Let AI answer common questions using your existing Discord discussions as context.",
		},
		{
			icon: BarChart3,
			title: "Community Analytics",
			description:
				"Gain insights into what your community is discussing and identify trending topics.",
		},
		{
			icon: Zap,
			title: "Instant Setup",
			description:
				"Add the bot to your server and start indexing in minutes. No complex configuration needed.",
		},
	];

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Why Answer Overflow?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
						Everything you need to make your Discord community&apos;s knowledge
						accessible to the world.
					</p>
				</div>
				<div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{features.map((feature) => (
						<FeatureCard key={feature.title} {...feature} />
					))}
				</div>
			</div>
		</section>
	);
}

function MarqueeRow({
	servers,
	direction = "left",
	mousePosition,
}: {
	servers: Server[];
	direction?: "left" | "right";
	mousePosition: MousePosition;
}) {
	return (
		<div className="relative flex overflow-hidden py-4">
			<div
				className={cn(
					"flex shrink-0 gap-4 pr-4",
					direction === "left"
						? "animate-marquee-left"
						: "animate-marquee-right",
				)}
			>
				{[...servers, ...servers].map((server, index) => (
					<GlowCard
						key={`${server.discordId}-${index}`}
						server={server}
						mousePosition={mousePosition}
					/>
				))}
			</div>
			<div
				className={cn(
					"flex shrink-0 gap-4 pr-4",
					direction === "left"
						? "animate-marquee-left"
						: "animate-marquee-right",
				)}
				aria-hidden="true"
			>
				{[...servers, ...servers].map((server, index) => (
					<GlowCard
						key={`${server.discordId}-dup-${index}`}
						server={server}
						mousePosition={mousePosition}
					/>
				))}
			</div>
		</div>
	);
}

function formatMemberCount(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toLocaleString();
}

const MIN_MEMBER_COUNT = 2000;

function UsedBySection({ servers }: { servers: Server[] }) {
	const [mousePosition, setMousePosition] = useState<MousePosition>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		setMousePosition({ x: e.clientX, y: e.clientY });
	};

	const handleMouseLeave = () => {
		setMousePosition(null);
	};

	const filteredServers = servers
		.filter((server) => server.approximateMemberCount >= MIN_MEMBER_COUNT)
		.sort((a, b) => b.approximateMemberCount - a.approximateMemberCount);

	if (filteredServers.length === 0) {
		return null;
	}

	const topRow: Server[] = [];
	const middleRow: Server[] = [];
	const bottomRow: Server[] = [];

	filteredServers.forEach((server, index) => {
		const rowIndex = index % 3;
		if (rowIndex === 0) {
			topRow.push(server);
		} else if (rowIndex === 1) {
			middleRow.push(server);
		} else {
			bottomRow.push(server);
		}
	});

	return (
		<section className="py-16 sm:py-24 overflow-hidden bg-muted/30">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Trusted by the largest communities
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
						Join hundreds of Discord communities already using Answer Overflow
						make their content discoverable.
					</p>
				</div>
			</div>
			<div
				className="mt-12"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				<MarqueeRow
					servers={topRow}
					direction="left"
					mousePosition={mousePosition}
				/>
				{middleRow.length > 0 && (
					<MarqueeRow
						servers={middleRow}
						direction="right"
						mousePosition={mousePosition}
					/>
				)}
				{bottomRow.length > 0 && (
					<MarqueeRow
						servers={bottomRow}
						direction="left"
						mousePosition={mousePosition}
					/>
				)}
			</div>
		</section>
	);
}

export function AddTestimonialCard() {
	return (
		<Link
			href="https://x.com/intent/tweet?text=I%20love%20%40AnswerOverflow%20because"
			className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-card/50 p-4 text-center transition-colors hover:border-primary/50 hover:bg-card"
		>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
				<Plus className="h-5 w-5 text-muted-foreground" />
			</div>
			<span className="mt-3 text-sm font-medium text-muted-foreground">
				Add your own
			</span>
		</Link>
	);
}

function PricingCard({
	name,
	price,
	description,
	features,
}: {
	name: string;
	price: string;
	description: string;
	features: string[];
}) {
	return (
		<div className="relative flex flex-col rounded-xl border bg-card p-6 shadow-sm">
			<div className="text-center">
				<h3 className="text-lg font-semibold text-foreground">{name}</h3>
				<div className="mt-4">
					<span className="text-4xl font-bold text-foreground">{price}</span>
					{price !== "Free" && (
						<span className="text-muted-foreground"> / month</span>
					)}
				</div>
				<p className="mt-2 text-sm text-muted-foreground">{description}</p>
			</div>
			<ul className="mt-6 space-y-3 flex-1">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2">
						<svg
							className="h-5 w-5 shrink-0 text-primary"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span className="text-sm text-muted-foreground">{feature}</span>
					</li>
				))}
			</ul>
			<div className="mt-6">
				<LinkButton href="/dashboard" variant="default" className="w-full">
					{price === "Free" ? "Setup for Free" : "First Month Free"}
				</LinkButton>
			</div>
		</div>
	);
}

function PricingSection() {
	const plans = [
		{
			name: "Free",
			price: "Free",
			description: "Hosted on answeroverflow.com",
			features: ["Unlimited page views", "Ad supported"],
		},
		{
			name: "Starter",
			price: "$125",
			description: "Perfect for growing communities",
			features: ["Ad free", "Host on your own domain", "Unlimited page views"],
		},
		{
			name: "Advanced",
			price: "$250",
			description: "For established communities",
			features: [
				"Ad free",
				"Host on your own domain",
				"Host on your own subpath (e.g. /community)",
				"Unlimited page views",
				"Priority support",
			],
		},
	];

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Simple Pricing
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
						Start for free. Upgrade at any time and your content will redirect.
					</p>
				</div>
				<div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{plans.map((plan) => (
						<PricingCard key={plan.name} {...plan} />
					))}
				</div>
			</div>
		</section>
	);
}

function CTASection() {
	return (
		<section className="py-16 sm:py-24 bg-primary/5">
			<div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
				<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
					Ready to Setup?
				</h2>
				<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
					Make your Discord community&apos;s knowledge discoverable today.
				</p>
				<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<LinkButton href="/dashboard" size="lg">
						Setup Today
						<ArrowRight className="ml-2 h-4 w-4" />
					</LinkButton>
					<LinkButton
						href="https://discord.answeroverflow.com"
						variant="outline"
						size="lg"
					>
						Have Questions? Get in Touch
					</LinkButton>
				</div>
			</div>
		</section>
	);
}

export function AboutPageClient({
	servers,
	testimonialsSection,
}: {
	servers: Server[];
	testimonialsSection: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<HeroSection />
			<UsedBySection servers={servers} />
			{testimonialsSection}
			<PricingSection />
			<CTASection />
		</div>
	);
}
