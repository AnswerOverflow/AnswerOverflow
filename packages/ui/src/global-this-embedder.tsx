'use client';
import { useServerInsertedHTML } from 'next/navigation';
import { useId } from 'react';
import { GlobalThisEmbed } from './global-this-embed';

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
