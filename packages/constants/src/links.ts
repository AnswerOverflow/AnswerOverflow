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

export const getDashboardUrl = () => {
	const deploymentEnv = 
		// eslint-disable-next-line n/no-process-env
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
	const nodeEnv = 
		// eslint-disable-next-line n/no-process-env
		process.env.NODE_ENV;
	
	// Local development
	if (deploymentEnv === 'local' || nodeEnv === 'development') {
		return 'http://localhost:3002';
	}
	
	// Production
	if (deploymentEnv === 'production') {
		return 'https://app.answeroverflow.com';
	}
	
	// For preview deployments, try to use VERCEL_URL
	const vercelUrl = 
		// eslint-disable-next-line n/no-process-env
		process.env.NEXT_PUBLIC_VERCEL_URL || 
		// eslint-disable-next-line n/no-process-env
		process.env.VERCEL_URL;
	if (vercelUrl) {
		return `https://${vercelUrl}`;
	}
	
	// Fallback to production for other cases
	return 'https://app.answeroverflow.com';
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
		host === 'https://www.answeroverflow.com' ||
		host.endsWith('.rhyssul.com')
	);
};

export const makeMainSiteLink = (path: string) => {
	return `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};

export const makeDashboardLink = (path: string) => {
	return `${getDashboardUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};
