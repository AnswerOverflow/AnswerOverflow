import React from 'react';
import type { DocsThemeConfig } from 'nextra-theme-docs';
import { AnswerOverflowLogo, Footer } from '@answeroverflow/ui';
const config: DocsThemeConfig = {
	logo: <AnswerOverflowLogo />,
	project: {
		link: 'https://contribute.answeroverflow.com',
	},
	chat: {
		link: 'https://discord.answeroverflow.com',
	},
	feedback: {
		// TODO: Add properties that Nextra passes and add to url
		useLink: () =>
			`https://github.com/AnswerOverflow/AnswerOverflow/issues/new?assignees=&labels=%F0%9F%93%96+documentation&template=documentation.yml&title=%5BDocs%5D%3A+`,
	},
	docsRepositoryBase:
		'https://github.com/AnswerOverflow/AnswerOverflow/tree/main/apps/docs',
	footer: {
		component: <Footer />,
	},
	useNextSeoProps: () => {
		return {
			noindex: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production',
		};
	},
};

export default config;
