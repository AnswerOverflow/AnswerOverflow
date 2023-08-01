// src/pages/App.tsx
import '../styles/globals.css';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { AppType } from 'next/app';
import hljs from 'highlight.js';

import { type NextTRPC, trpc } from '@answeroverflow/ui/src/utils/trpc';
import { useEffect } from 'react';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { AnalyticsProvider } from '@answeroverflow/hooks';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, ...pageProps },
}) => {
	// TODO: We should look if this causes console errors
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);

	return (
		<SessionProvider session={session}>
			<AnalyticsProvider>
				<CommitBanner />
				<Component {...pageProps} />
			</AnalyticsProvider>
		</SessionProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
