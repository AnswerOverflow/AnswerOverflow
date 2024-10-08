'use client';
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
import { toast } from 'react-toastify';
import { useDashboardContext } from '../components/dashboard-context';
import { ConfigureDomainCard } from '../components/domains';
import { TierAccessOnly } from '../components/tier-access-only';
import { CurrentPlanCard } from './components';
import { ServerWithFlags } from '@answeroverflow/core/zod';
import React from 'react';

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
					description="When enabled, all messages will be public."
					flagKey="considerAllMessagesPublic"
					label="Enabled"
				/>
				<ToggleServerFlag
					flagKey="anonymizeMessages"
					title="Anonymize Messages"
					description="When enabled, messages will be anonymized."
					label="Enabled"
				/>
				<ToggleServerFlag
					flagKey="readTheRulesConsentEnabled"
					title="Read the Rules Consent"
					description="When enabled, users will be required to consent to the rules before they can use the chat."
					label="Enabled"
				/>
			</div>
		</div>
	);
}
