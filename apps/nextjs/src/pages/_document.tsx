import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from "next/document";

class MyDocument extends Document {
  static override async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initial_props = await Document.getInitialProps(ctx);

    return initial_props;
  }

  override render() {
    return (
      // eslint-disable-next-line tailwindcss/no-custom-classname
      <Html className="dark">
        <Head>
          {/* TODO: Swap for Next font */}
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body className="dark:bg-neutral-800">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
