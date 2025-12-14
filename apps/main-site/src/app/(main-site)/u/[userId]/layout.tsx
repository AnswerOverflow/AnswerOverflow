type Props = {
	children: React.ReactNode;
};

export default async function UserLayout(props: Props) {
	return (
		<main className="flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px] flex-col gap-4 px-4">
				{props.children}
			</div>
		</main>
	);
}
