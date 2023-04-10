// src/pages/App.tsx
import '../styles/globals.css';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { AppType } from 'next/app';
import hljs from 'highlight.js';

import { NextTRPC, trpc } from '@answeroverflow/ui';
import { useEffect } from 'react';
import { useAnalytics } from '@answeroverflow/hooks';

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

	const WithAnalytics = ({ children }: { children: React.ReactNode }) => {
		useAnalytics();
		return <>{children}</>;
	};

	return (
		<SessionProvider session={session}>
			<WithAnalytics>
				<Component {...pageProps} />
			</WithAnalytics>
		</SessionProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
