"use client";

import { api } from "@packages/database/convex/_generated/api";
import { trackEvent } from "@packages/ui/analytics/client/track-event";
import { Badge } from "@packages/ui/components/badge";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@packages/ui/components/empty";
import { Label } from "@packages/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { Textarea } from "@packages/ui/components/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@packages/ui/components/tooltip";
import { useMutation } from "convex/react";
import { ChannelType } from "discord-api-types/v10";
import {
	CheckCircle2,
	GitBranch,
	MessageSquare,
	Search,
	Send,
	Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useMemo, useState } from "react";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import type { ForumTagInfo } from "../components/wizard-context";
import { useWizard } from "../components/wizard-context";
import { WizardNav } from "../components/wizard-nav";

const REFERRAL_SOURCES = [
	{ value: "google", label: "Google Search" },
	{ value: "discord", label: "Discord" },
	{ value: "twitter", label: "Twitter/X" },
	{ value: "github", label: "GitHub" },
	{ value: "reddit", label: "Reddit" },
	{ value: "youtube", label: "YouTube" },
	{ value: "friend", label: "Friend or Colleague" },
	{ value: "blog", label: "Blog Post or Article" },
	{ value: "other", label: "Other" },
] as const;

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
	const posthog = usePostHog();
	const {
		serverId,
		serverSettings,
		allChannels,
		getConfiguredChannels,
		getAllForumChannels,
		onboardingFeedback,
		setOnboardingFeedback,
	} = useWizard();

	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const applyConfiguration = useMutation(
		api.authenticated.onboarding.applyRecommendedConfiguration,
	);

	const configuredChannels = getConfiguredChannels();
	const forumChannels = getAllForumChannels();
	const backHref =
		forumChannels.length > 0
			? `/dashboard/${serverId}/onboarding/configure/solved-tags`
			: `/dashboard/${serverId}/onboarding/configure/solution-instructions`;

	const channelInfoMap = useMemo(() => {
		const map = new Map<
			string,
			{ name: string; type: number; availableTags?: Array<ForumTagInfo> }
		>();
		for (const channel of allChannels) {
			map.set(channel.id.toString(), {
				name: channel.name,
				type: channel.type,
				availableTags: channel.availableTags,
			});
		}
		return map;
	}, [allChannels]);

	const handleApply = async () => {
		setIsApplying(true);
		setError(null);

		try {
			const channelConfigurations = configuredChannels.map((config) => ({
				channelId: config.channelId,
				indexingEnabled: config.indexingEnabled,
				autoThreadEnabled: config.autoThreadEnabled,
				markSolutionEnabled: config.markSolutionEnabled,
				sendMarkSolutionInstructionsInNewThreads:
					config.sendMarkSolutionInstructionsInNewThreads,
				solutionTagId: config.solutionTagId,
			}));

			await applyConfiguration({
				serverId: BigInt(serverId),
				channelConfigurations,
				serverSettings,
			});

			// Track onboarding feedback via PostHog analytics
			if (onboardingFeedback.referralSource || onboardingFeedback.feedback) {
				trackEvent(
					"Onboarding Feedback Submitted",
					{
						serverId,
						serverName: serverId,
						referralSource: onboardingFeedback.referralSource,
						feedback: onboardingFeedback.feedback,
					},
					posthog,
				);
			}

			router.push(`/dashboard/${serverId}`);
		} catch (err) {
			console.error("Failed to apply configuration:", err);
			setError("Failed to save configuration. Please try again.");
			setIsApplying(false);
		}
	};

	if (configuredChannels.length === 0) {
		return (
			<StepLayout
				title="Review Configuration"
				description="Review your configuration before applying."
			>
				<WizardCard>
					<Empty className="py-12">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Settings2 />
							</EmptyMedia>
							<EmptyTitle>No channels configured</EmptyTitle>
							<EmptyDescription>
								You haven't configured any channels. You can go back to
								configure channels or continue to the dashboard.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</WizardCard>

				<WizardCard>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="referral-source-empty">
								How did you hear about Answer Overflow?
							</Label>
							<Select
								value={onboardingFeedback.referralSource ?? ""}
								onValueChange={(value) =>
									setOnboardingFeedback({ referralSource: value || null })
								}
							>
								<SelectTrigger id="referral-source-empty" className="w-full">
									<SelectValue placeholder="Select an option" />
								</SelectTrigger>
								<SelectContent>
									{REFERRAL_SOURCES.map((source) => (
										<SelectItem key={source.value} value={source.value}>
											{source.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="feedback-empty">
								Any feedback or suggestions? (optional)
							</Label>
							<Textarea
								id="feedback-empty"
								placeholder="Tell us what you think, what features you'd like to see, or any issues you encountered..."
								value={onboardingFeedback.feedback ?? ""}
								onChange={(e) =>
									setOnboardingFeedback({ feedback: e.target.value || null })
								}
								rows={3}
							/>
						</div>
					</div>
				</WizardCard>

				<WizardNav
					backHref={backHref}
					nextHref={`/dashboard/${serverId}`}
					nextLabel="Continue to Dashboard"
				/>
			</StepLayout>
		);
	}

	return (
		<StepLayout
			title="Review Configuration"
			description="Review your configuration. You can change these settings at any time from the dashboard."
		>
			<WizardCard>
				<div className="space-y-3">
					<div className="space-y-1.5 max-h-[400px] overflow-y-auto">
						{configuredChannels.map((config) => {
							const channelId = config.channelId.toString();
							const channelInfo = channelInfoMap.get(channelId);
							if (!channelInfo) return null;

							const isForum = channelInfo.type === ChannelType.GuildForum;

							let solvedTag: ForumTagInfo | null = null;
							if (config.solutionTagId && isForum) {
								const tag = channelInfo.availableTags?.find(
									(t) => t.id === config.solutionTagId,
								);
								if (tag) {
									solvedTag = tag;
								}
							}

							return (
								<div
									key={channelId}
									className="flex items-start gap-3 px-3 py-2.5 border rounded-lg"
								>
									<div className="flex items-center gap-2 min-w-0 shrink-0">
										{isForum ? (
											<MessageSquare className="h-4 w-4 text-muted-foreground" />
										) : (
											<span className="text-muted-foreground">#</span>
										)}
										<span className="font-medium text-sm truncate max-w-[120px]">
											{channelInfo.name}
										</span>
									</div>
									<div className="flex flex-wrap gap-1 ml-auto">
										{config.indexingEnabled && (
											<FeatureBadge
												icon={Search}
												label="Index"
												tooltip="Messages sent in this channel will appear on Answer Overflow"
											/>
										)}
										{config.autoThreadEnabled && (
											<FeatureBadge
												icon={GitBranch}
												label="Auto-thread"
												tooltip="A thread will be created for every message in this channel"
											/>
										)}
										{config.markSolutionEnabled && (
											<FeatureBadge
												icon={CheckCircle2}
												label="Solutions"
												tooltip="Users can mark messages as the solution to their question"
											/>
										)}
										{config.sendMarkSolutionInstructionsInNewThreads && (
											<FeatureBadge
												icon={Send}
												label="Instructions"
												tooltip="New threads will receive a message explaining how to mark a solution"
											/>
										)}
										{solvedTag && <SolvedTagBadge tag={solvedTag} />}
									</div>
								</div>
							);
						})}
					</div>

					{error && (
						<div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
							{error}
						</div>
					)}
				</div>
			</WizardCard>

			<WizardCard>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="referral-source">
							How did you hear about Answer Overflow?
						</Label>
						<Select
							value={onboardingFeedback.referralSource ?? ""}
							onValueChange={(value) =>
								setOnboardingFeedback({ referralSource: value || null })
							}
						>
							<SelectTrigger id="referral-source" className="w-full">
								<SelectValue placeholder="Select an option" />
							</SelectTrigger>
							<SelectContent>
								{REFERRAL_SOURCES.map((source) => (
									<SelectItem key={source.value} value={source.value}>
										{source.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="feedback">
							Any feedback or suggestions? (optional)
						</Label>
						<Textarea
							id="feedback"
							placeholder="Tell us what you think, what features you'd like to see, or any issues you encountered..."
							value={onboardingFeedback.feedback ?? ""}
							onChange={(e) =>
								setOnboardingFeedback({ feedback: e.target.value || null })
							}
							rows={3}
						/>
					</div>
				</div>
			</WizardCard>

			<WizardNav
				backHref={backHref}
				nextLabel="Apply Configuration"
				onNext={handleApply}
				isLoading={isApplying}
			/>
		</StepLayout>
	);
}
