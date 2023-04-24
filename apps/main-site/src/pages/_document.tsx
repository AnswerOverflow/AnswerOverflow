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
					{/* TODO: Swap for Next font */}
					<link
						href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap"
						rel="stylesheet"
					/>
				</Head>
				<body className="bg-ao-white dark:bg-ao-black">
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
