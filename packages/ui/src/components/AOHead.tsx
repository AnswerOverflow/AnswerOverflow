import type { ServerPublic } from "@answeroverflow/api";
import Head from "next/head";
import { makeServerIconLink } from "./ServerIcon";

interface HeadProps {
  title: string;
  description: string;
  image?: string;
  addPrefix?: boolean;
  imageWidth?: string;
  imageHeight?: string;
  type?: string;
  server?: ServerPublic;
  path: string;
}

export const AOHead = ({
  title,
  description,
  image = "https://answeroverflow.com/content/branding/metaHeader.png",
  server = undefined,
  addPrefix: addPrefix = false,
  imageWidth: imageWidth = "1200",
  imageHeight: imageHeight = "630",
  type = "website",
  path,
}: HeadProps) => {
  if (server) {
    const serverIconImage = makeServerIconLink(server, 256);
    imageWidth = "256";
    imageHeight = "256";
    if (serverIconImage) {
      image = serverIconImage;
    } else {
      image = "https://answeroverflow.com/content/branding/logoIcon.png";
    }
  }
  if (addPrefix) title += " - Answer Overflow";
  return (
    <Head>
      <title>{title}</title>
      <link
        rel="canonical"
        // Prevent incorrectly doing a double slash
        href={`https://www.answeroverflow.com/${path.startsWith("/") ? path.slice(1) : path}`}
      />
      <meta name="description" content={description} key="desc" />
      <meta property="og:site_name" content="Answer Overflow" />
      <meta property="og:title" content={title} />
      <meta property="og:type" content={type} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={imageWidth} />
      <meta property="og:image:height" content={imageHeight} />
      <meta name="robots" content="index,follow" />
      {!server && <meta property="twitter:card" content="summary_large_image" />}
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
    </Head>
  );
};

export default AOHead;
