import NextDocument, {
	Html,
	Head,
	Main,
	NextScript,
	DocumentContext,
} from 'next/document';

const MyDocument = ({ isStaging }: { isStaging?: boolean }) => {
	return (
		<Html className="dark">
			<Head>
				{/* TODO: Swap for Next font */}
				<link
					href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap"
					rel="stylesheet"
				/>
				{isStaging ? (
					<meta name="robots" content="noindex, follow" />
				) : (
					<meta name="robots" content="index, follow" />
				)}
			</Head>
			<body className="dark:bg-neutral-800">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
};

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
	const initialProps = await NextDocument.getInitialProps(ctx);
	const isStaging = process.env.STAGING === '1';
	return { isStaging, ...initialProps };
};

export default MyDocument;
