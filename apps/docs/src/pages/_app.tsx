// src/pages/App.tsx
import '../styles/globals.css';
import type { AppType } from 'next/app';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/commit-banner';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics/client';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType = ({ Component, pageProps: { ...pageProps } }) => {
	return (
		<AnalyticsProvider>
			<CommitBanner />
			<Component {...pageProps} />
		</AnalyticsProvider>
	);
};

export default MyApp;
