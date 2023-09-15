import Document, {
	Html,
	Head,
	Main,
	NextScript,
	type DocumentContext,
	type DocumentInitialProps,
} from 'next/document';
import React from 'react';
import { DATA_UNBLOCKER } from '../utils/data-unblocker';
import Script from 'next/script';

class MyDocument extends Document {
	static override async getInitialProps(
		ctx: DocumentContext,
	): Promise<DocumentInitialProps> {
		const initialProps = await Document.getInitialProps(ctx);

		return initialProps;
	}

	override render() {
		return (
			<Html className="dark" data-theme="dark" lang="en">
				<Head>
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
				</Head>
				<body className="bg-background text-primary">
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
