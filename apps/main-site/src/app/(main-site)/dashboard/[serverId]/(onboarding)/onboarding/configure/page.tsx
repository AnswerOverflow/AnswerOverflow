"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Checkbox } from "@packages/ui/components/checkbox";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useAction, useMutation } from "convex/react";
import {
	AlertCircle,
	CheckCircle2,
	Hash,
	Loader2,
	Megaphone,
	MessageSquare,
	Settings,
	Sparkles,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ChannelRecommendation = {
	id: bigint;
	name: string;
	type: number;
	shouldIndex: boolean;
	recommendedSettings: {
		indexingEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		solutionTagId?: bigint;
	};
};

type RecommendedConfiguration = {
	channels: Array<ChannelRecommendation>;
	serverSettings: {
		considerAllMessagesPublicEnabled: boolean;
		anonymizeMessagesEnabled: boolean;
	};
	detectionSuccessful: boolean;
	errorMessage?: string;
};

type ConfigureState = "loading" | "ready" | "applying" | "error";

export default function ConfigurePage() {
	const router = useRouter();
	const params = useParams();
	const serverId = params.serverId as string;
	const { data: session, isPending: isSessionPending } = useSession({
		allowAnonymous: false,
	});

	const [state, setState] = useState<ConfigureState>("loading");
	const [configuration, setConfiguration] =
		useState<RecommendedConfiguration | null>(null);
	const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(
		new Set(),
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const getRecommendedConfiguration = useAction(
		api.authenticated.onboarding_action.getRecommendedConfiguration,
	);
	const applyConfiguration = useMutation(
		api.authenticated.onboarding.applyRecommendedConfiguration,
	);

	const loadConfiguration = useCallback(async () => {
		if (!serverId) return;

		setState("loading");
		setErrorMessage(null);

		try {
			const config = await getRecommendedConfiguration({
				serverId: BigInt(serverId),
			});

			setConfiguration(config);

			const initialSelected = new Set<string>();
			for (const channel of config.channels) {
				if (channel.shouldIndex) {
					initialSelected.add(channel.id.toString());
				}
			}
			setSelectedChannelIds(initialSelected);

			setState("ready");
		} catch (error) {
			console.error("Failed to load configuration:", error);
			setErrorMessage(
				"Failed to analyze your server's channels. Please try again or configure manually.",
			);
			setState("error");
		}
	}, [serverId, getRecommendedConfiguration]);

	useEffect(() => {
		if (isSessionPending) return;

		if (!session?.user) {
			router.push(`/dashboard/${serverId}/onboarding`);
			return;
		}

		if (!serverId) {
			router.push("/dashboard");
			return;
		}

		loadConfiguration();
	}, [session, isSessionPending, serverId, router, loadConfiguration]);

	const handleApplyConfiguration = async () => {
		if (!serverId || !configuration) return;

		setState("applying");

		try {
			const channelConfigurations = configuration.channels
				.filter((channel) => selectedChannelIds.has(channel.id.toString()))
				.map((channel) => ({
					channelId: channel.id,
					indexingEnabled: true,
					markSolutionEnabled: true,
					sendMarkSolutionInstructionsInNewThreads: true,
					solutionTagId: channel.recommendedSettings.solutionTagId,
				}));

			await applyConfiguration({
				serverId: BigInt(serverId),
				channelConfigurations,
				serverSettings: {
					considerAllMessagesPublicEnabled: true,
					anonymizeMessagesEnabled: false,
				},
			});

			router.push(`/dashboard/${serverId}`);
		} catch (error) {
			console.error("Failed to apply configuration:", error);
			setErrorMessage("Failed to apply configuration. Please try again.");
			setState("ready");
		}
	};

	const handleSkip = () => {
		if (serverId) {
			router.push(`/dashboard/${serverId}/channels`);
		}
	};

	const toggleChannel = (channelId: string) => {
		setSelectedChannelIds((prev) => {
			const next = new Set(prev);
			if (next.has(channelId)) {
				next.delete(channelId);
			} else {
				next.add(channelId);
			}
			return next;
		});
	};

	const getChannelIcon = (type: number) => {
		if (type === 15) return MessageSquare;
		if (type === 5) return Megaphone;
		return Hash;
	};

	const getChannelTypeName = (type: number) => {
		if (type === 15) return "Forum";
		if (type === 5) return "Announcement";
		return "Text";
	};

	if (isSessionPending || state === "loading") {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl space-y-6">
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
							</div>
							<CardTitle className="text-2xl">Analyzing Your Server</CardTitle>
							<CardDescription>
								We're detecting which channels would be good for indexing...
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	if (state === "error" || !configuration) {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl">
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<AlertCircle className="h-12 w-12 text-destructive" />
							</div>
							<CardTitle className="text-2xl">
								Couldn't Auto-Detect Channels
							</CardTitle>
							<CardDescription>
								{errorMessage ||
									"We weren't able to automatically detect your help channels."}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-4">
							<Button onClick={loadConfiguration} variant="outline">
								Try Again
							</Button>
							<Button onClick={handleSkip}>Configure Manually</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	const recommendedChannels = configuration.channels.filter(
		(c) => c.shouldIndex,
	);
	const hasRecommendations = recommendedChannels.length > 0;

	if (!hasRecommendations) {
		return (
			<main className="flex items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-2xl">
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Settings className="h-12 w-12 text-muted-foreground" />
							</div>
							<CardTitle className="text-2xl">
								No Help Channels Detected
							</CardTitle>
							<CardDescription>
								We didn't automatically detect any help or support channels in
								your server. You can configure which channels to index manually.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-4">
							<Button onClick={handleSkip} size="lg">
								Configure Channels Manually
							</Button>
							<Button variant="ghost" asChild>
								<Link href={`/dashboard/${serverId}`}>Skip for Now</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		);
	}

	return (
		<main className="flex items-center justify-center p-4 md:p-8">
			<div className="w-full max-w-2xl space-y-6">
				<Card>
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<Sparkles className="h-12 w-12 text-primary" />
						</div>
						<CardTitle className="text-2xl">
							Recommended Configuration
						</CardTitle>
						<CardDescription>
							We analyzed your server and found {recommendedChannels.length}{" "}
							channel{recommendedChannels.length !== 1 ? "s" : ""} that would be
							great for indexing.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<h3 className="font-medium text-sm text-muted-foreground">
								Channels to Index
							</h3>
							<div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
								{recommendedChannels.map((channel) => {
									const Icon = getChannelIcon(channel.type);
									const isSelected = selectedChannelIds.has(
										channel.id.toString(),
									);
									return (
										<div
											key={channel.id.toString()}
											className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
											onClick={() => toggleChannel(channel.id.toString())}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() =>
													toggleChannel(channel.id.toString())
												}
											/>
											<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">
													{channel.name}
												</div>
												<div className="text-xs text-muted-foreground">
													{getChannelTypeName(channel.type)}
													{channel.recommendedSettings.solutionTagId &&
														" • Solved tag detected"}
												</div>
											</div>
											{isSelected && (
												<CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
											)}
										</div>
									);
								})}
							</div>
						</div>

						<div className="space-y-2">
							<h3 className="font-medium text-sm text-muted-foreground">
								Settings That Will Be Applied
							</h3>
							<ul className="text-sm space-y-1 text-muted-foreground">
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Mark Solution enabled with instructions in new threads
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Messages will be publicly visible
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 text-green-500" />
									Usernames will NOT be anonymized
								</li>
							</ul>
						</div>

						<div className="flex flex-col gap-3 pt-4">
							<Button
								onClick={handleApplyConfiguration}
								size="lg"
								disabled={state === "applying" || selectedChannelIds.size === 0}
							>
								{state === "applying" ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Applying...
									</>
								) : (
									`Apply & Go to Dashboard (${selectedChannelIds.size} channel${selectedChannelIds.size !== 1 ? "s" : ""})`
								)}
							</Button>
							<Button
								variant="outline"
								onClick={handleSkip}
								disabled={state === "applying"}
							>
								Skip & Configure Manually
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
