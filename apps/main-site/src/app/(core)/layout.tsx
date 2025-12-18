import { Providers } from "@packages/ui/components/providers";

export default function CoreLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Providers tenant={null}>{children}</Providers>;
}
