import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
	override render() {
		return (
			<Html className="dark">
				<Head>
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
