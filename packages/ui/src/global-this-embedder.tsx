'use client';
import { useServerInsertedHTML } from 'next/navigation';
import { useId } from 'react';
import { GlobalThisEmbed } from './global-this-embed';
import { cache } from 'react';

const updateGlobalThis = cache((embedOnServer: GlobalThisEmbed) => {
	if (typeof window === 'undefined') {
		// @ts-expect-error - globalThis is not typed
		globalThis.__SERVER_CONTENT = embedOnServer;
	} else {
		// @ts-expect-error - globalThis is not typed
		globalThis.__SERVER_CONTENT = embedOnServer;
	}
});

export function GlobalThisEmbedder(props: {
	embedOnServer: GlobalThisEmbed;
	children: React.ReactNode;
}) {
	const id = useId();
	updateGlobalThis(props.embedOnServer);

	useServerInsertedHTML(() => {
		const html = [
			`globalThis.__SERVER_CONTENT = ${JSON.stringify(props.embedOnServer)}`,
		];
		return (
			<script key={id} dangerouslySetInnerHTML={{ __html: html.join('') }} />
		);
	});
	return props.children;
}
