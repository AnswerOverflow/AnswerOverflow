import 'core-js/actual';
import '../styles/globals.css';
import '../styles/code.scss';

import type { NextWebVitalsMetric } from 'next/app';
import ProgressBar from '@badrap/bar-of-progress';
// import Router from 'next/navigation';
import { event } from 'nextjs-google-analytics';
// import { NextTRPC, trpc } from '@answeroverflow/ui/src/utils/trpc';
import React, { ReactNode } from 'react';
import { DATA_UNBLOCKER } from '../utils/data-unblocker';
import Script from 'next/script';

// const progress = new ProgressBar({
// 	size: 2,
// 	color: '#0094ff',
// 	className: 'bar-of-progress',
// 	delay: 100,
// });

// Router.events.on('routeChangeStart', progress.start);
// Router.events.on('routeChangeComplete', progress.finish);
// Router.events.on('routeChangeError', progress.finish);

export function reportWebVitals({
	id,
	name,
	label,
	value,
}: NextWebVitalsMetric) {
	event(name, {
		category: label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
		value: Math.round(name === 'CLS' ? value * 1000 : value), // values must be integers
		label: id, // id unique to current page load
		nonInteraction: true, // avoids affecting bounce rate.
	});
}

// export default (trpc as NextTRPC).withTRPC(MyApp);

export default function RootLayout(props: { children: ReactNode }) {
	return (
		<html lang="en" dir="ltr">
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: Buffer.from(DATA_UNBLOCKER, 'base64').toString(),
					}}
				/>
				<Script
					id="Adsense-id"
					data-ad-client="ca-pub-1392153990042810"
					async={true}
					src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1392153990042810"
					crossOrigin="anonymous"
				/>
			</head>
			<body>{props.children}</body>
		</html>
	);
}
