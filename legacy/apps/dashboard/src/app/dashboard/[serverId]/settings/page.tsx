'use client';
import { useDashboardContext } from '../components/dashboard-context';
import { ConfigureDomainCard } from '../components/domains';
import { TierAccessOnly } from '../components/tier-access-only';
import { CurrentPlanCard } from './components';

export default function Settings() {
	const { server: data } = useDashboardContext();
	return (
		<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
			<CurrentPlanCard />
		</div>
	);
}
