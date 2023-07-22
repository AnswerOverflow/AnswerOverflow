import type { ServerPublic } from '@answeroverflow/api';
import { webClientEnv } from '@answeroverflow/env/web';
export function getServerHomepageUrl(server: ServerPublic) {
	if (!server.customDomain) {
		return `/c/${server.id}`;
	}
	return `http${
		webClientEnv.NEXT_PUBLIC_NODE_ENV === 'production' ? 's' : ''
	}://${server.customDomain}`;
}
