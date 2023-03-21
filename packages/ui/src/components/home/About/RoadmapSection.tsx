import { Heading } from '~ui/components/primitives/Heading';
import { Paragraph } from '~ui/components/primitives/Paragraph';

export const RoadmapSection = () => {
	return (
		<section className="w-full">
			<Heading.H2 className="text-center">
				And we are just getting started
			</Heading.H2>
			<div className="mt-4 flex w-full items-center justify-center rounded-standard border-2 border-white/[.13] bg-[#191B1F]">
				<Paragraph className="py-72 text-2xl">Roadmap</Paragraph>
			</div>
		</section>
	);
};
