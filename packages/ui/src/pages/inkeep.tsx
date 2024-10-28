/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client';
import { ServerPublic } from '@answeroverflow/api/router/types';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { makeServerIconLink } from '../server-icon';

export const InKeepWidget = (props: { server: ServerPublic }) => {
	const widgetRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(false);
	const theme = useTheme();
	useEffect(() => {
		console.log('element', document.documentElement);
		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (!entry?.isIntersecting) {
					return;
				}
				// Load the script only when the widget is in view
				const script = document.createElement('script', {});
				script.type = 'module';
				script.src = 'https://unpkg.com/@inkeep/uikit-js@0.3.5/dist/embed.js';
				script.defer = true;
				script.id = 'inkeep-embed-script';
				document.body.appendChild(script);

				script.onload = () => {
					// Initialize the Inkeep widget after the script has loaded
					// @ts-expect-error
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					window.Inkeep().embed({
						componentType: 'EmbeddedChat', // required
						targetElement: document.getElementById('ikp-embedded-chat-target'), // required
						properties: {
							// eslint-disable-next-line n/no-process-env
							env: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production',
							shouldAutoFocusInput: false,
							baseSettings: {
								apiKey: '4f4da4a5733032ef8ff23e3b7906954877fd0ee54d58d1e0',
								integrationId: 'clpbm8p9y002ns601vbbswj5i',
								organizationId: 'clog94xy50001s601yapu7swn',
								organizationDisplayName: 'Drizzle ORM',
								primaryBrandColor: '#FFFFFF',
								colorMode: {
									forcedColorMode: theme.theme,
								},
							},
							introMessage: `Hi, I'm {{botName}} \n\n I'm an AI assistant trained on documentation, help articles, and other content. \n\n Ask me anything about {{chatSubjectName}}.`,
							style: { visibility: 'visible' },
							modalSettings: {},
							searchSettings: {},
							aiChatSettings: {
								botAvatarSrcUrl: makeServerIconLink(props.server, 128),
							},
						},
						aiChatSettings: {
							placeholder: 'Ask me anything',
						},
					});
					setIsVisible(true);
				};

				// Stop observing after loading
				if (widgetRef.current) observer.unobserve(widgetRef.current);
			},
			{ threshold: 0.1 },
		);

		if (widgetRef.current) {
			observer.observe(widgetRef.current);
		}

		return () => {
			if (widgetRef.current) {
				// eslint-disable-next-line react-hooks/exhaustive-deps
				observer.unobserve(widgetRef.current);
			}
		};
	}, [widgetRef, props.server]);

	return (
		<div
			ref={widgetRef}
			style={{
				display: 'flex',
				justifyContent: 'center',
				height: 'calc(100vh - 16px)',
				width: '100%',
				transition: 'opacity 0.5s ease-in-out',
				opacity: isVisible ? 1 : 0, // Smoothly fade in the widget
			}}
		>
			<div style={{ maxHeight: '600px', height: '100%' }}>
				<div id="ikp-embedded-chat-target"></div>
			</div>
		</div>
	);
};
