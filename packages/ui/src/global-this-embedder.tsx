'use client';
import { useServerInsertedHTML } from 'next/navigation';
import { useId } from 'react';

export type GlobalThisEmbed = {
	subpath?: string | null;
};

export function GlobalThisEmbedder(props: {
	embedOnServer: GlobalThisEmbed;
	children: React.ReactNode;
}) {
	const id = useId();
	// @ts-expect-error - globalThis is not typed
	globalThis.__SERVER_CONTENT = props.embedOnServer;

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

export function getGlobalThisValue(): GlobalThisEmbed | undefined {
	// @ts-expect-error - globalThis is not typed
	return globalThis.__SERVER_CONTENT;
}
