'use client';
import { useDashboardContext } from '../components/dashboard-context';
import { ConfigureDomainCard } from '../components/domains';
import { TierAccessOnly } from '../components/tier-access-only';
import { CurrentPlanCard } from './components';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@answeroverflow/ui/src/ui/card';
import { Switch } from '@answeroverflow/ui/src/ui/switch';
import { Label } from '@answeroverflow/ui/src/ui/label';
import { trpc } from 'packages/ui/src/utils/client';
import { toast } from 'react-toastify';

function ToggleConsiderAllMessagesPublic() {
	const { server: data } = useDashboardContext();
	const setConsiderAllMessagesPublic =
		trpc.servers.setConsiderAllMessagesPublic.useMutation({
			onError: (error) => {
				toast.error(error.message);
			},
		});
	const utils = trpc.useUtils();
	return (
		<Card>
			<CardHeader>
				<CardTitle>Consider All Messages Public</CardTitle>
				<CardDescription>
					When enabled, all messages will be public.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2 pt-0">
					<Switch
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onCheckedChange={async (checked) => {
							utils.dashboard.fetchDashboardById.setData(data.id, {
								...data,
								flags: {
									...data.flags,
									considerAllMessagesPublic: checked,
								},
							});
							await setConsiderAllMessagesPublic.mutateAsync({
								serverId: data.id,
								enabled: checked,
							});
							await utils.dashboard.fetchDashboardById.invalidate();
						}}
						checked={data.flags.considerAllMessagesPublic}
					/>
					<Label>Enabled</Label>
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
				<ToggleConsiderAllMessagesPublic />
			</div>
		</div>
	);
}
