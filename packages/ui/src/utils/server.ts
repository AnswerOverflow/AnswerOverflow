import type { ServerPublic } from '@answeroverflow/api';
import { sharedEnvs } from '@answeroverflow/env/shared';
export function getServerHomepageUrl(server: ServerPublic) {
	if (!server.customDomain) {
		return `/c/${server.id}`;
	}
	return `http${sharedEnvs.NODE_ENV === 'production' ? 's' : ''}://${
		server.customDomain
	}`;
}
