import type { ServerPublic } from '@answeroverflow/api';
export function getServerHomepageUrl(server: ServerPublic) {
	if (
		// eslint-disable-next-line n/no-process-env
		process.env.NODE_ENV !== 'production' &&
		!server.customDomain
	) {
		return `/c/${server.id}`;
	}
	if (!server.customDomain) {
		return `https://www.answeroverflow.com/c/${server.id}`;
	}
	return `http${
		// eslint-disable-next-line n/no-process-env
		process.env.NODE_ENV === 'production' ? 's' : ''
	}://${server.customDomain}`;
}

// TODO: Handle this at the API level
export function getServerDescription(server: ServerPublic) {
	return (
		server.description ?? `Join the ${server.name} server to ask questions!`
	);
}
