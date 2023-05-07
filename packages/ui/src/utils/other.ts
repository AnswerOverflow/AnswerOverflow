// terrible file name

import type { ServerPublic } from '@answeroverflow/api';

// TODO: Handle this at the API level
export function getServerDescription(server: ServerPublic) {
	return (
		server.description ?? `Join the ${server.name} server to ask questions!`
	);
}
