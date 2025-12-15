"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { Label } from "@packages/ui/components/label";
import { Switch } from "@packages/ui/components/switch";
import { StepLayout } from "./components/step-layout";
import { WizardNav } from "./components/wizard-nav";
import { useWizard } from "./components/wizard-context";

export default function ServerSettingsPage() {
	const { serverId, serverSettings, setServerSettings } = useWizard();

	return (
		<StepLayout
			title="Server Settings"
			description="Configure how your server's content appears on the web."
		>
			<Card>
				<CardContent className="pt-6 space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<Label
								htmlFor="public-messages"
								className="text-base font-medium"
							>
								Public messages
							</Label>
							<p className="text-sm text-muted-foreground">
								Allow messages to be indexed by search engines like Google. This
								makes your community's knowledge discoverable to anyone
								searching for answers.
							</p>
						</div>
						<Switch
							id="public-messages"
							checked={serverSettings.publicMessages}
							onCheckedChange={(checked) =>
								setServerSettings({ publicMessages: checked })
							}
						/>
					</div>
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<Label
								htmlFor="anonymize-usernames"
								className="text-base font-medium"
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
							checked={serverSettings.anonymizeUsernames}
							onCheckedChange={(checked) =>
								setServerSettings({ anonymizeUsernames: checked })
							}
						/>
					</div>
				</CardContent>
			</Card>

			<WizardNav
				backHref={`/dashboard/${serverId}/onboarding`}
				nextHref={`/dashboard/${serverId}/onboarding/configure/indexing`}
			/>
		</StepLayout>
	);
}
