import type { ServerPublic } from '@answeroverflow/api';
export function getServerHomepageUrl(server: ServerPublic) {
	if (!server.customDomain) {
		return `/c/${server.id}`;
	}
	return `http${
		// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
		process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? 's' : ''
	}://${server.customDomain}`;
}
