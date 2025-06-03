import type { ServerPublic } from '@answeroverflow/api/router/types';

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
	const protocol =
		// eslint-disable-next-line n/no-process-env
		process.env.NODE_ENV === 'production' ? 'https' : 'http';
	const subpath = server.subpath ? `/${server.subpath}` : '';
	return `${protocol}://${server.customDomain}${subpath}`;
}

export function getServerCustomUrl(server: ServerPublic, path: string = '') {
	if (!server.customDomain) {
		return null;
	}
	const protocol =
		// eslint-disable-next-line n/no-process-env
		process.env.NODE_ENV === 'production' ? 'https' : 'http';
	const subpath = server.subpath ? `/${server.subpath}` : '';
	return `${protocol}://${server.customDomain}${subpath}${path}`;
}

// TODO: Handle this at the API level
export function getServerDescription(server: ServerPublic) {
	return (
		server.description ?? `Join the ${server.name} server to ask questions!`
	);
}
