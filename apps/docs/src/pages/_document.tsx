import Document, {
	Html,
	Head,
	Main,
	NextScript,
	type DocumentContext,
	type DocumentInitialProps,
} from 'next/document';

class MyDocument extends Document {
	static override async getInitialProps(
		ctx: DocumentContext,
	): Promise<DocumentInitialProps> {
		const initialProps = await Document.getInitialProps(ctx);

		return initialProps;
	}

	override render() {
		return (
			<Html className="dark">
				<Head>
					<link
						href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap"
						rel="stylesheet"
					/>
				</Head>
				<Main />
				<NextScript />
			</Html>
		);
	}
}

export default MyDocument;
