"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import type { ForumTagInfo } from "../components/wizard-context";
import { useWizard } from "../components/wizard-context";
import { WizardNav } from "../components/wizard-nav";

function TagEmoji({ tag }: { tag: ForumTagInfo }) {
	if (tag.emojiId) {
		return (
			<img
				src={`https://cdn.discordapp.com/emojis/${tag.emojiId}.webp?size=20`}
				alt=""
				className="size-4 shrink-0"
			/>
		);
	}
	if (tag.emojiName) {
		return <span className="shrink-0">{tag.emojiName}</span>;
	}
	return null;
}

function TagDisplay({ tag }: { tag: ForumTagInfo }) {
	return (
		<span className="flex items-center gap-1.5">
			<TagEmoji tag={tag} />
			<span className="truncate">{tag.name}</span>
		</span>
	);
}

export default function SolvedTagsPage() {
	const {
		serverId,
		configurations,
		setChannelConfigs,
		getAllForumChannels,
		getAIRecommendation,
	} = useWizard();

	const forumChannels = getAllForumChannels();

	const eligibleForums = useMemo(() => {
		return forumChannels.filter((forum) =>
			configurations.some(
				(c) => c.channelId === forum.id && c.markSolutionEnabled,
			),
		);
	}, [forumChannels, configurations]);

	const hasEligibleForums = eligibleForums.length > 0;

	const [tagSelections, setTagSelections] = useState<
		Map<string, string | undefined>
	>(() => {
		const selections = new Map<string, string | undefined>();
		for (const forum of eligibleForums) {
			const existing = configurations.find((c) => c.channelId === forum.id);
			if (existing?.solutionTagId) {
				selections.set(forum.id.toString(), existing.solutionTagId.toString());
			} else {
				const rec = getAIRecommendation(forum.id.toString());
				if (rec?.solutionTagId) {
					selections.set(forum.id.toString(), rec.solutionTagId.toString());
				}
			}
		}
		return selections;
	});

	const handleTagChange = (channelId: string, tagId: string | undefined) => {
		setTagSelections((prev) => {
			const next = new Map(prev);
			if (tagId) {
				next.set(channelId, tagId);
			} else {
				next.delete(channelId);
			}
			return next;
		});
	};

	const commitSelections = () => {
		const updatedConfigs = configurations.map((config) => {
			const channelId = config.channelId.toString();
			const tagIdStr = tagSelections.get(channelId);
			return {
				...config,
				solutionTagId: tagIdStr ? BigInt(tagIdStr) : undefined,
			};
		});
		setChannelConfigs(updatedConfigs);
	};

	const handleSkip = () => {
		const updatedConfigs = configurations.map((config) => ({
			...config,
			solutionTagId: undefined,
		}));
		setChannelConfigs(updatedConfigs);
	};

	return (
		<StepLayout
			title="Solved Tags"
			description="For forum channels, you can automatically apply a tag when a question is marked as solved. This makes it easy to see which posts have answers."
			video={
				hasEligibleForums ? (
					<FeaturePreviewPlaceholder feature="solved-tags" />
				) : undefined
			}
		>
			<WizardCard>
				{hasEligibleForums ? (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								{eligibleForums.length} forum channel
								{eligibleForums.length !== 1 ? "s" : ""}
							</span>
						</div>
						<div className="max-h-[280px] overflow-y-auto space-y-1.5">
							{eligibleForums.map((channel) => {
								const tags = channel.availableTags ?? [];
								const currentTagId = tagSelections.get(channel.id.toString());
								const selectedTag = tags.find(
									(t) => t.id.toString() === currentTagId,
								);

								return (
									<div
										key={channel.id.toString()}
										className="flex items-center justify-between gap-4 px-3 py-2.5 border rounded-lg"
									>
										<div className="flex items-center gap-3 min-w-0">
											<MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
											<span className="font-medium truncate text-sm">
												{channel.name}
											</span>
										</div>
										{tags.length > 0 ? (
											<Select
												value={currentTagId ?? "none"}
												onValueChange={(value) =>
													handleTagChange(
														channel.id.toString(),
														value === "none" ? undefined : value,
													)
												}
											>
												<SelectTrigger className="w-[180px]">
													<SelectValue placeholder="Select a tag">
														{selectedTag ? (
															<TagDisplay tag={selectedTag} />
														) : (
															"No tag"
														)}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">No tag</SelectItem>
													{tags.map((tag) => (
														<SelectItem
															key={tag.id.toString()}
															value={tag.id.toString()}
														>
															<TagDisplay tag={tag} />
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<span className="text-sm text-muted-foreground">
												No tags available
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div className="text-center py-12 text-muted-foreground min-h-[200px] flex flex-col items-center justify-center">
						<p className="font-medium">
							No forum channels with mark solution enabled.
						</p>
						<p className="text-sm mt-1">
							Solved tags are only available for forum channels with mark
							solution enabled.
						</p>
					</div>
				)}
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/complete`}
				showSkip={hasEligibleForums}
				onSkip={handleSkip}
				onNext={commitSelections}
			/>
		</StepLayout>
	);
}
