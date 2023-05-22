import Document, {
	Html,
	Main,
	NextScript,
	type DocumentContext,
	type DocumentInitialProps,
	Head,
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
				<Head />
				<Main />
				<NextScript />
			</Html>
		);
	}
}

export default MyDocument;
