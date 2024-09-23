import { headers } from 'next/headers';
import {
	findUserServerSettingsByApiKey,
	increaseApiKeyUsage,
} from '@answeroverflow/db/src/user-server-settings';
import { UserServerSettingsWithFlags } from '@answeroverflow/db';
import { JSONStringify } from '@answeroverflow/db/src/utils/json-big';

export function getApiKey() {
	const headersList = headers();
	const bearer = headersList.get('authorization');
	return bearer?.replace('Bearer ', '');
}

export function getUserServerSettingsForKey() {
	const token = getApiKey();
	if (!token) return undefined;
	return findUserServerSettingsByApiKey(token);
}

export async function protectedGet<T, K>(input: {
	fetch: (uss: UserServerSettingsWithFlags) => Promise<T | null>;
	isApiTokenValid: (args: {
		uss: UserServerSettingsWithFlags;
		data: T;
	}) => boolean;
	transform?: (data: T) => K;
}) {
	const token = getApiKey();
	if (!token)
		return new Response('Missing api token', {
			status: 400,
		});
	const uss = await findUserServerSettingsByApiKey(token);
	if (!uss) {
		return new Response(
			'API token passed correctly in request but we do not have a match. Try regenerating the token and passing a new one.',
			{
				status: 401,
			},
		);
	}
	const result = await input.fetch(uss);
	if (!result) {
		return new Response('Not found', {
			status: 404,
		});
	}
	if (
		!input.isApiTokenValid({
			uss,
			data: result,
		})
	) {
		return new Response('API token found but is not valid for this request', {
			status: 403,
		});
	}
	void increaseApiKeyUsage(token);
	return new Response(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call
		JSONStringify(input.transform ? input.transform(result) : result),
		{
			status: 200,
			headers: {
				'x-api-calls-remaining': `${50000 - uss.apiCallsUsed + 1}`,
			},
		},
	);
}
