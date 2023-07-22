import { PageWrapper } from './PageWrapper';
import { Pricing, PricingDialog } from './Pricing';

export const PricingStory = () => (
	<PageWrapper>
		<Pricing />
	</PageWrapper>
);

export const PricingDialogStory = () => (
	<PricingDialog enterprisePlanCheckoutUrl={''} proPlanCheckoutUrl={''} />
);
