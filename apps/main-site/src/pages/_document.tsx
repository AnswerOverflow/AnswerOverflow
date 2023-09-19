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
				<Head></Head>
				<body className="bg-background text-primary">
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
