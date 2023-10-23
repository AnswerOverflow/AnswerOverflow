// src/pages/App.tsx
import '../styles/globals.css';
import type { Session } from 'next-auth';
import type { AppType } from 'next/app';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics/client';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { ...pageProps },
}) => {
	return (
		<AnalyticsProvider>
			<CommitBanner />
			<Component {...pageProps} />
		</AnalyticsProvider>
	);
};
