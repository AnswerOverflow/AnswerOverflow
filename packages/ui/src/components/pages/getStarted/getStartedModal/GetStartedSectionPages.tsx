import { Button, Heading, Paragraph } from '~ui/components/primitives';
import type {
	GetStartedModalPage,
	GetStartedModalPageProps,
} from './GetStartedSection';

export const IntroPage: React.FC<GetStartedModalPageProps> = ({ setPage }) => {
	return (
		<div className="flex flex-col items-center justify-center">
			<div className="flex flex-col gap-8">
				<Heading.H1 className="pb-8 text-center text-4xl">
					What are you looking for?
				</Heading.H1>
				<div className="grid grid-cols-2 gap-16 pb-16">
					<Button variant={'outline'}>I{"'"}m just looking around</Button>
					<Button>I{"'"}m ready to add to my server</Button>
				</div>
			</div>
		</div>
	);
};

export const getStartedModalPages: GetStartedModalPage[] = [
	{
		pageIndex: 'introPage',
		component: IntroPage,
	},
];
