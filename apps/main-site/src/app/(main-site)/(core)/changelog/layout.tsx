export default function Layout({ children }: { children: React.ReactNode }) {
	return <div className="mx-auto max-w-3xl">{children}</div>;
}
export const dynamic = 'force-static';
