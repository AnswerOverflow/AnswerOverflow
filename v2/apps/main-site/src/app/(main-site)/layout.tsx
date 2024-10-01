import { Metadata } from "next";
import { metadata as baseMetadata } from "@answeroverflow/ui/layouts/root";
export const metadata: Metadata = {
  ...baseMetadata,
  other: {
    "google-adsense-account": "ca-pub-1392153990042810",
  },
};

export default function AnnouncementBannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
