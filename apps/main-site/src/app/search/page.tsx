type Props = {
	searchParams: Promise<{ q?: string; s?: string; c?: string }>;
};

export default async function SearchPage(_props: Props) {
	return <div>SearchPage</div>;
}
