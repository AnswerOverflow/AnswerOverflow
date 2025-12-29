"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@packages/ui/components/tooltip";
import { useMutation } from "convex/react";
import {
	CheckCircle2,
	GitBranch,
	Loader2,
	MessageSquare,
	Search,
	Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import {
	type ChannelRecommendation,
	type ForumTagInfo,
	useWizard,
} from "../components/wizard-context";

const CHANNEL_TYPE_FORUM = 15;

type ChannelFeatures = {
	indexing: boolean;
	autoThread: boolean;
	markSolution: boolean;
	solutionInstructions: boolean;
	solvedTag: ForumTagInfo | null;
};

function getChannelFeatures(
	channel: ChannelRecommendation,
	channelSettings: {
		autoThreadEnabled: Set<string>;
		markSolutionEnabled: Set<string>;
		solutionInstructionsEnabled: Set<string>;
		solvedTags: Map<string, string>;
	},
): ChannelFeatures {
	const channelId = channel.id.toString();

	let solvedTag: ForumTagInfo | null = null;
	const solvedTagId = channelSettings.solvedTags.get(channelId);
	if (solvedTagId && channel.type === CHANNEL_TYPE_FORUM) {
		const tag = channel.availableTags?.find(
			(t) => t.id.toString() === solvedTagId,
		);
		if (tag) {
			solvedTag = tag;
		}
	}

	return {
		indexing: true,
		autoThread: channelSettings.autoThreadEnabled.has(channelId),
		markSolution: channelSettings.markSolutionEnabled.has(channelId),
		solutionInstructions:
			channelSettings.solutionInstructionsEnabled.has(channelId),
		solvedTag,
	};
}

function FeatureBadge({
	icon: Icon,
	label,
	tooltip,
}: {
	icon: typeof Search;
	label: string;
	tooltip: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Badge
					variant="secondary"
					className="gap-1 text-xs font-normal cursor-help"
				>
					<Icon className="h-3 w-3" />
					{label}
				</Badge>
			</TooltipTrigger>
			<TooltipContent>
				<p>{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}

function TagEmoji({ tag }: { tag: ForumTagInfo }) {
	if (tag.emojiId) {
		return (
			<img
				src={`https://cdn.discordapp.com/emojis/${tag.emojiId}.webp?size=16`}
				alt=""
				className="size-3"
			/>
		);
	}
	if (tag.emojiName) {
		return <span className="text-xs">{tag.emojiName}</span>;
	}
	return null;
}

function SolvedTagBadge({ tag }: { tag: ForumTagInfo }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Badge
					variant="secondary"
					className="gap-1 text-xs font-normal cursor-help"
				>
					<TagEmoji tag={tag} />
					{tag.name}
				</Badge>
			</TooltipTrigger>
			<TooltipContent>
				<p>This tag will be applied when a thread is marked as solved</p>
			</TooltipContent>
		</Tooltip>
	);
}

export default function CompletePage() {
	const router = useRouter();
	const {
		serverId,
		serverSettings,
		channelSettings,
		getIndexedChannels,
		getAllForumChannels,
	} = useWizard();

	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const applyConfiguration = useMutation(
		api.authenticated.onboarding.applyRecommendedConfiguration,
	);

	const indexedChannels = getIndexedChannels();
	const forumChannels = getAllForumChannels();
	const backHref =
		forumChannels.length > 0
			? `/dashboard/${serverId}/onboarding/configure/solved-tags`
			: `/dashboard/${serverId}/onboarding/configure/solution-instructions`;

	const handleApply = async () => {
		setIsApplying(true);
		setError(null);

		try {
			const channelConfigurations = indexedChannels.map((channel) => {
				const channelId = channel.id.toString();
				const tagIdStr = channelSettings.solvedTags.get(channelId);
				return {
					channelId: channel.id,
					indexingEnabled: true,
					autoThreadEnabled: channelSettings.autoThreadEnabled.has(channelId),
					markSolutionEnabled:
						channelSettings.markSolutionEnabled.has(channelId),
					sendMarkSolutionInstructionsInNewThreads:
						channelSettings.solutionInstructionsEnabled.has(channelId),
					solutionTagId: tagIdStr ? BigInt(tagIdStr) : undefined,
				};
			});

			await applyConfiguration({
				serverId: BigInt(serverId),
				channelConfigurations,
				serverSettings: {
					considerAllMessagesPublicEnabled: serverSettings.publicMessages,
					anonymizeMessagesEnabled: serverSettings.anonymizeUsernames,
				},
			});

			router.push(`/dashboard/${serverId}`);
		} catch (err) {
			console.error("Failed to apply configuration:", err);
			setError("Failed to save configuration. Please try again.");
			setIsApplying(false);
		}
	};

	return (
		<StepLayout
			title="Review Configuration"
			description="Review your configuration, you can change these settings at any time."
		>
			<WizardCard className="pb-0">
				<div className="space-y-4">
					<div className="text-sm text-muted-foreground">
						{indexedChannels.length} channel
						{indexedChannels.length !== 1 ? "s" : ""} will be indexed
					</div>

					<div className="space-y-2 max-h-80 overflow-y-auto">
						{indexedChannels.map((channel) => {
							const channelId = channel.id.toString();
							const features = getChannelFeatures(channel, channelSettings);
							const isForum = channel.type === CHANNEL_TYPE_FORUM;

							return (
								<div
									key={channelId}
									className="flex items-start gap-3 p-3 border rounded-lg"
								>
									<div className="flex items-center gap-2 min-w-0 shrink-0">
										{isForum ? (
											<MessageSquare className="h-4 w-4 text-muted-foreground" />
										) : (
											<span className="text-muted-foreground">#</span>
										)}
										<span className="font-medium text-sm truncate max-w-[140px]">
											{channel.name}
										</span>
									</div>
									<div className="flex flex-wrap gap-1 ml-auto">
										<FeatureBadge
											icon={Search}
											label="Index"
											tooltip="Messages sent in this channel will appear on Answer Overflow"
										/>
										{features.autoThread && (
											<FeatureBadge
												icon={GitBranch}
												label="Auto-thread"
												tooltip="A thread will be created for every message in this channel"
											/>
										)}
										{features.markSolution && (
											<FeatureBadge
												icon={CheckCircle2}
												label="Solutions"
												tooltip="Users can mark messages as the solution to their question"
											/>
										)}
										{features.solutionInstructions && (
											<FeatureBadge
												icon={Send}
												label="Instructions"
												tooltip="New threads will receive a message explaining how to mark a solution"
											/>
										)}
										{features.solvedTag && (
											<SolvedTagBadge tag={features.solvedTag} />
										)}
									</div>
								</div>
							);
						})}
						<div className="pb-2" />
					</div>

					{error && (
						<div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
							{error}
						</div>
					)}
				</div>
			</WizardCard>

			<div className="flex items-center justify-between pt-3 sm:pt-4 mt-auto">
				<Button
					variant="ghost"
					onClick={() => router.push(backHref)}
					disabled={isApplying}
				>
					Back
				</Button>
				<Button onClick={handleApply} disabled={isApplying}>
					{isApplying ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Applying...
						</>
					) : (
						"Apply Configuration"
					)}
				</Button>
			</div>
		</StepLayout>
	);
}
