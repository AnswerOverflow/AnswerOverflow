/*
  GITHUB
*/

export const GITHUB_LINK = 'https://github.com/AnswerOverflow/AnswerOverflow';
export const CREATE_NEW_DOCS_ISSUE_LINK = `https://github.com/AnswerOverflow/AnswerOverflow/issues/new?assignees=&labels=%F0%9F%93%96+documentation&template=documentation.yml&title=%5BDocs%5D%3A+`;
export const DOCS_LINK_BASE =
	'https://github.com/AnswerOverflow/AnswerOverflow/tree/main/apps/docs';

/*
SOCIAL
*/

export const TWITTER_LINK = 'https://twitter.com/AnswerOverflow';
export const DISCORD_LINK = 'https://discord.answeroverflow.com';

/*
  OTHER
*/

export const WEBSITE_URL = 'https://answeroverflow.com';
export const DOCS_URL = 'https://docs.answeroverflow.com';
export const WAITLIST_URL = 'https://forms.gle/6YLPPGi8X2DCr29T7';

export const getBaseUrl = () => {
	const base =
		// eslint-disable-next-line n/no-process-env
		process.env.NEXT_PUBLIC_SITE_URL ??
		// eslint-disable-next-line n/no-process-env
		(process.env.NODE_ENV !== 'development'
			? 'https://www.answeroverflow.com'
			: 'http://localhost:3000');
	return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const getMainSiteHostname = () => {
	const url = new URL(getBaseUrl());
	return url.host;
};

export const isOnMainSite = (host: string) => {
	// TODO: Do we even need getMainSiteHostname()?
	return (
		host === getMainSiteHostname() ||
		host.endsWith('.vercel.app') ||
		host === 'https://www.answeroverflow.com'
	);
};

export const makeMainSiteLink = (path: string) => {
	return `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};
