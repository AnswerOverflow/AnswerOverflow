import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import { Button, Heading, Paragraph } from '~ui/components/primitives';
import type {
	GetStartedModalPage,
	GetStartedModalPageProps,
} from './GetStartedModal';

export const IntroPage: React.FC<GetStartedModalPageProps> = ({ setPage }) => {
	return (
		<div className="flex flex-col items-center justify-center gap-4">
			<div className="flex flex-col items-center justify-center">
				<Dialog.Title className="font-header text-3xl font-bold text-ao-white">
					Welcome to Answer Overflow
				</Dialog.Title>
				<Paragraph className="text-center font-body text-lg dark:text-ao-white/[.8]">
					Answer Overflow is an open source project designed to bring discord
					channels to your favorite search engine, enabling users to easily find
					the info they need, fast.
				</Paragraph>
			</div>

			<Separator.Root
				className="my-4 h-[1px] w-2/3 bg-ao-white/50"
				orientation="horizontal"
			/>

			<Heading.H2 className="text-2xl">What are you looking for?</Heading.H2>
			<div className="flex flex-col gap-5">
				<Button variant={'outline'}>I{"'"}m just looking around</Button>
				<Button>I{"'"}m ready to add to my server</Button>
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
