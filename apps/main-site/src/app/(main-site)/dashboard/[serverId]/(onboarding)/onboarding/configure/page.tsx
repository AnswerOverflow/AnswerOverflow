"use client";

import { BlueLink } from "@packages/ui/components/blue-link";
import { Label } from "@packages/ui/components/label";
import { Switch } from "@packages/ui/components/switch";
import { StepLayout } from "./components/step-layout";
import { WizardCard } from "./components/wizard-card";
import { useWizard } from "./components/wizard-context";
import { WizardNav } from "./components/wizard-nav";

export default function ServerSettingsPage() {
	const { serverId, serverSettings, setServerSettings } = useWizard();

	return (
		<StepLayout
			title="Server Settings"
			description="Configure how your server's content appears on the web."
			requiresChannels={false}
		>
			<WizardCard>
				<div className="space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1 flex-1">
							<Label htmlFor="public-messages" className="text-sm font-medium">
								Consider All Messages In Indexed Channels Public
							</Label>
							<p className="text-sm text-muted-foreground">
								All messages in indexed channels will be considered public and
								displayed on the web. Learn more about{" "}
								<BlueLink
									href="https://www.answeroverflow.com/docs/user-settings/displaying-messages"
									target="_blank"
								>
									displaying messages
								</BlueLink>
								.
							</p>
						</div>
						<Switch
							id="public-messages"
							checked={serverSettings.considerAllMessagesPublicEnabled}
							onCheckedChange={(checked) =>
								setServerSettings({ considerAllMessagesPublicEnabled: checked })
							}
						/>
					</div>
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1 flex-1">
							<Label
								htmlFor="anonymize-usernames"
								className="text-sm font-medium"
							>
								Anonymize usernames
							</Label>
							<p className="text-sm text-muted-foreground">
								Replace Discord usernames with random names like "Helpful
								Hedgehog" or "Curious Cat". Use this if your community prefers
								privacy.
							</p>
						</div>
						<Switch
							id="anonymize-usernames"
							checked={serverSettings.anonymizeMessagesEnabled}
							onCheckedChange={(checked) =>
								setServerSettings({ anonymizeMessagesEnabled: checked })
							}
						/>
					</div>
				</div>
			</WizardCard>

			<WizardNav
				nextHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
			/>
		</StepLayout>
	);
}
