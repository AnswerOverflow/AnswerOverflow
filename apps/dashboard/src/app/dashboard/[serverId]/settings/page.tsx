'use client';
import { ServerWithFlags } from '@answeroverflow/core/zod';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@answeroverflow/ui/ui/card';
import { Label } from '@answeroverflow/ui/ui/label';
import { Switch } from '@answeroverflow/ui/ui/switch';
import { trpc } from '@answeroverflow/ui/utils/client';
import React from 'react';
import { toast } from 'react-toastify';
import { useDashboardContext } from '../components/dashboard-context';
import { ConfigureDomainCard } from '../components/domains';
import { TierAccessOnly } from '../components/tier-access-only';
import { CurrentPlanCard } from './components';
import { BlueLink } from '@answeroverflow/ui/ui/blue-link';

interface ToggleServerFlagProps {
	title: React.ReactNode;
	description: React.ReactNode;
	flagKey: keyof ServerWithFlags['flags']; // Assuming ServerFlags is the type for data.flags
	label: React.ReactNode;
}

function ToggleServerFlag({
	title,
	description,
	flagKey,
	label,
}: ToggleServerFlagProps) {
	const { server: data } = useDashboardContext();
	const updateMutation = trpc.servers.update.useMutation({
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const utils = trpc.useUtils();

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2 pt-0">
					<Switch
						onCheckedChange={async (checked) => {
							utils.dashboard.fetchDashboardById.setData(data.id, {
								...data,
								flags: {
									...data.flags,
									[flagKey]: checked,
								},
							});
							await updateMutation.mutateAsync({
								id: data.id,
								flags: {
									[flagKey]: checked,
								},
							});
							await utils.dashboard.fetchDashboardById.invalidate();
						}}
						checked={data.flags[flagKey]}
					/>
					<Label>{label}</Label>
				</div>
			</CardContent>
		</Card>
	);
}

export default function Settings() {
	const { server: data } = useDashboardContext();

	return (
		// 100% width, items center
		<div className="flex w-full items-center justify-center">
			<div className="flex max-w-[800px] flex-col gap-4">
				<CurrentPlanCard />
				<TierAccessOnly
					enabledFor={['PRO', 'OPEN_SOURCE', 'ENTERPRISE']}
					currentPlan={data.plan}
					proPlanCheckoutUrl={
						data.status === 'inactive' ? data.proPlanCheckoutUrl : null
					}
					hasSubscribedBefore={
						data.status === 'inactive' ? data.hasSubscribedBefore : true
					}
					enterprisePlanCheckoutUrl={
						data.status === 'inactive' ? data.enterprisePlanCheckoutUrl : null
					}
				>
					<ConfigureDomainCard />
				</TierAccessOnly>
				<ToggleServerFlag
					title="Consider All Messages Public"
					description={
						<>
							All messages in the server will be considered public and displayed
							on the web. Learn more about{' '}
							<BlueLink
								href="https://docs.answeroverflow.com/user-settings/displaying-messages"
								target="_blank"
							>
								displaying messages
							</BlueLink>
							.
						</>
					}
					flagKey="considerAllMessagesPublic"
					label="Enabled"
				/>
				<ToggleServerFlag
					flagKey="anonymizeMessages"
					title="Anonymize Messages"
					description={
						<>
							Replace user names with a random name. This is closer to
							pseudonymous as users can still join the server and search for the
							message content.
						</>
					}
					label="Enabled"
				/>
				<ToggleServerFlag
					flagKey="readTheRulesConsentEnabled"
					title="Read the Rules Consent"
					description={
						<>
							Add a consent prompt to the server rules to mark new users as
							consenting to display their messages.
						</>
					}
					label="Enabled"
				/>
			</div>
		</div>
	);
}
