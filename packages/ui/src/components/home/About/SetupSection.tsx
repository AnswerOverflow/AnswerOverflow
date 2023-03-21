import { Button } from '~ui/components/primitives';
import { Heading } from '~ui/components/primitives/Heading';

export const SetupSection = () => {
	return (
		<div className="flex flex-col items-center justify-center">
			<Heading.H1>5 Minute Setup</Heading.H1>
			<Heading.H2 className="text-lg">Tagline here</Heading.H2>
			<div className="mt-4 grid grid-cols-3 grid-rows-1 gap-20">
				<div className="flex shrink flex-col items-center justify-center rounded-standard border-2 border-white/[.13] p-20">
					<Heading.H3 className="pb-10">You click add</Heading.H3>
					<Button>Add to server</Button>
				</div>

				<div className="flex grow flex-col items-center justify-center rounded-standard border-2 border-white/[.13] p-20">
					<Heading.H3 className="pb-10">One command setup</Heading.H3>
				</div>

				<div className="flex flex-col items-center justify-center rounded-standard border-4 border-ao-green p-20 shadow-[0px_0px_17px_rgba(75,_181,_67,_0.25)]">
					<Heading.H3 className="pb-10">Ready for indexing</Heading.H3>
				</div>
			</div>
		</div>
	);
};
