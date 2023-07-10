import type { ServerPublic } from '@answeroverflow/api';
export function getServerHomepageUrl(server: ServerPublic) {
	if (!server.customDomain) {
		return `/c/${server.id}`;
	}
	return `http${process.env.NODE_ENV === 'production' ? 's' : ''}://${
		server.customDomain
	}`;
}
