'use client';
import type { NextPage } from 'next';
import { OnboardingLanding } from '@answeroverflow/ui/src/components/pages/onboarding/OnboardingContainer';
import TRPCProvider from '../../components/trpc-provider';
import { ToastContainer } from 'react-toastify';
// eslint-disable-next-line @typescript-eslint/naming-convention
const HomePage: NextPage = () => {
	return (
		<TRPCProvider>
			<ToastContainer />
			<OnboardingLanding />
		</TRPCProvider>
	);
};

export default HomePage;
