import { Button } from '~ui/components/primitives';
import { Heading } from '~ui/components/primitives/Heading';
import { Paragraph } from '~ui/components/primitives/Paragraph';

export const EndSection = () => {
	return (
		<section className="mt-16 flex w-full flex-col items-center justify-center bg-[#191B1F] py-5">
			<Heading.H2>Why not give it a try?</Heading.H2>
			<Paragraph>
				Join the rapidly increasing list of communities using Answer Overflow to
				empower their servers
			</Paragraph>
			<Button>Add To Server</Button>
		</section>
	);
};
