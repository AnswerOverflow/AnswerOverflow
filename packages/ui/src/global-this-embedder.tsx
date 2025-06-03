'use client';
import { useServerInsertedHTML } from 'next/navigation';

export type GlobalThisEmbed = {
	subpath?: string | null;
};

export function GlobalThisEmbedder(props: {
	embedOnServer: GlobalThisEmbed;
}) {
	// @ts-expect-error - globalThis is not typed
	globalThis.__SERVER_CONTENT ??= props.embedOnServer;

	useServerInsertedHTML(() => {
		const html = [
			`globalThis.__SERVER_CONTENT = ${JSON.stringify(props.embedOnServer)}`,
		];
		return (
			<script
				key={'global-this-embedder'}
				dangerouslySetInnerHTML={{ __html: html.join('') }}
			/>
		);
	});
	return null;
}

export function getGlobalThisValue(): GlobalThisEmbed | undefined {
	// @ts-expect-error - globalThis is not typed
	return globalThis.__SERVER_CONTENT;
}
