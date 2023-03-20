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

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, ...pageProps },
}) => {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);
	return (
		<SessionProvider session={session}>
			<Component {...pageProps} />
		</SessionProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
