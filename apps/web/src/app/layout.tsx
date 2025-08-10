import type { Metadata } from "next";
import "@packages/ui/globals.css"
import ConvexClientProvider from "./ConvexClientProvider";
import { Providers } from "@packages/ui/components/providers";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ConvexClientProvider>
          <Providers>{children}</Providers>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
