"use client";

import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@packages/ui/components/ai-elements/prompt-input";
import { LockIcon } from "lucide-react";
import { useChatContext } from "./chat-state-provider";
import { RateLimitWarning, SignInRequiredWarning } from "./chat-warnings";
import { DiscordInviteCTA } from "./discord-invite-cta";
import { DiscordServerSelector } from "./discord-server-selector";
import { GitHubRepoSelector } from "./github-repo-selector";

export function ChatPromptInput() {
	const chat = useChatContext();

	const handleSubmit = (message: PromptInputMessage) => {
		const text = message.text?.trim();
		if (text) {
			chat.handleSubmit(text);
		}
	};

	const showWarningBanner =
		chat.serverNotIndexed ||
		chat.showDiscordCta ||
		chat.selectedModelRequiresSignIn ||
		(chat.rateLimitStatus && chat.rateLimitStatus.remaining < 3);

	return (
		<>
			{chat.serverNotIndexed && chat.effectiveServerContext && (
				<DiscordInviteCTA
					variant="server"
					serverName={chat.effectiveServerContext.name}
					discordInviteUrl={chat.serverInviteUrl}
				/>
			)}
			{chat.showDiscordCta && chat.effectiveRepo && (
				<DiscordInviteCTA
					repoOwner={chat.effectiveRepo.owner}
					repoName={chat.effectiveRepo.repo}
					discordInviteCode={chat.discordInviteQuery.data?.inviteCodes[0]}
				/>
			)}
			{chat.selectedModelRequiresSignIn && !chat.showDiscordCta && (
				<SignInRequiredWarning
					modelName={chat.selectedModelData?.name ?? "this model"}
					onSignIn={chat.handleSignIn}
				/>
			)}
			{chat.rateLimitStatus &&
				chat.rateLimitStatus.remaining < 3 &&
				!chat.showDiscordCta &&
				!chat.selectedModelRequiresSignIn && (
					<RateLimitWarning
						remaining={chat.rateLimitStatus.remaining}
						resetsAt={chat.rateLimitStatus.resetsAt}
						isAnonymous={chat.rateLimitStatus.isAnonymous}
						onSignIn={chat.handleSignIn}
					/>
				)}
			<PromptInput onSubmit={handleSubmit} attachedTop={showWarningBanner}>
				<PromptInputBody>
					<PromptInputTextarea
						value={chat.input}
						onChange={(e) => chat.setInput(e.target.value)}
						placeholder={chat.placeholder}
					/>
				</PromptInputBody>
				<PromptInputFooter>
					<PromptInputTools>
						<DiscordServerSelector
							selectedServer={chat.effectiveServerContext}
							onSelectServer={chat.setServerOverride}
						/>
						<GitHubRepoSelector
							selectedRepo={chat.effectiveRepo}
							onSelectRepo={chat.setSelectedRepo}
						/>
					</PromptInputTools>
					<PromptInputSubmit disabled={chat.isSubmitDisabled}>
						{chat.selectedModelRequiresSignIn ? (
							<LockIcon className="size-4" />
						) : undefined}
					</PromptInputSubmit>
				</PromptInputFooter>
			</PromptInput>
		</>
	);
}
