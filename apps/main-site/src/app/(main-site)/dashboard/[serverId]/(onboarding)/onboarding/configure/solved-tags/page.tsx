"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { MessageSquare } from "lucide-react";
import { FeaturePreviewPlaceholder } from "../components/mock-message-preview";
import { StepLayout } from "../components/step-layout";
import { WizardCard } from "../components/wizard-card";
import { WizardNav } from "../components/wizard-nav";
import { useWizard } from "../components/wizard-context";

export default function SolvedTagsPage() {
	const {
		serverId,
		channelSettings,
		setSolvedTag,
		getForumIndexedChannels,
		getMarkSolutionChannels,
	} = useWizard();

	const forumChannels = getForumIndexedChannels();
	const markSolutionChannels = getMarkSolutionChannels();

	const eligibleForums = forumChannels.filter((forum) =>
		markSolutionChannels.some((c) => c.id === forum.id),
	);
	const hasEligibleForums = eligibleForums.length > 0;

	return (
		<StepLayout
			title="Solved Tags"
			description="For forum channels, you can automatically apply a tag when a question is marked as solved. This makes it easy to see which posts have answers."
		>
			<WizardCard>
				{hasEligibleForums ? (
					<div className="space-y-6">
						<FeaturePreviewPlaceholder feature="solved-tags" />
						<div className="border-t pt-6 space-y-2">
							{eligibleForums.map((channel) => {
								const tags = channel.availableTags ?? [];
								const currentTagId = channelSettings.solvedTags.get(
									channel.id.toString(),
								);

								return (
									<div
										key={channel.id.toString()}
										className="flex items-center justify-between gap-4 p-3 border rounded-lg"
									>
										<div className="flex items-center gap-3 min-w-0">
											<MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
											<span className="font-medium truncate">
												{channel.name}
											</span>
										</div>
										{tags.length > 0 ? (
											<Select
												value={currentTagId ?? "none"}
												onValueChange={(value) =>
													setSolvedTag(
														channel.id.toString(),
														value === "none" ? undefined : value,
													)
												}
											>
												<SelectTrigger className="w-[180px]">
													<SelectValue placeholder="Select a tag" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">No tag</SelectItem>
													{tags.map((tag) => (
														<SelectItem
															key={tag.id.toString()}
															value={tag.id.toString()}
														>
															{tag.name}
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
					<div className="text-center py-8 text-muted-foreground">
						<p>No forum channels with mark solution enabled.</p>
						<p className="text-sm mt-2">
							Solved tags are only available for forum channels.
						</p>
					</div>
				)}
			</WizardCard>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding/configure/solution-instructions`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/complete`}
				showSkip={hasEligibleForums}
			/>
		</StepLayout>
	);
}
