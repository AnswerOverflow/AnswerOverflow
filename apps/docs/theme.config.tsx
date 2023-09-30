import React from 'react';
import type { DocsThemeConfig } from 'nextra-theme-docs';
import { AnswerOverflowLogo } from '@answeroverflow/ui/src/components/primitives/base/AnswerOverflowLogo';
import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';
import {
	CREATE_NEW_DOCS_ISSUE_LINK,
	DISCORD_LINK,
	DOCS_LINK_BASE,
	GITHUB_LINK,
	ANSWER_OVERFLOW_BLUE_HEX,
} from '@answeroverflow/constants';
import { useRouter } from 'next/navigation';
import { webClientEnv } from '@answeroverflow/env/web';

// https://nextra.site/docs/docs-theme/theme-configuration
const config: DocsThemeConfig = {
	logo: <AnswerOverflowLogo width={168} />,
	logoLink: 'https://www.answeroverflow.com',
	project: {
		link: GITHUB_LINK,
	},
	chat: {
		link: DISCORD_LINK,
	},
	darkMode: true,
	feedback: {
		// TODO: Add properties that Nextra passes and add to url
		useLink: () => CREATE_NEW_DOCS_ISSUE_LINK,
	},
	useNextSeoProps() {
		const { asPath } = useRouter();
		return {
			titleTemplate: asPath === '/' ? '%s' : '%s - Answer Overflow Docs',
			themeColor: ANSWER_OVERFLOW_BLUE_HEX,
			description:
				'Improve & index your Discord help channels into Google with Answer Overflow',
			noindex: webClientEnv.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production',
		};
	},
	docsRepositoryBase: DOCS_LINK_BASE,
	footer: {
		component: <Footer />,
	},
};

export default config;
