import { Button } from '~ui/components/primitives';
import { Heading } from '~ui/components/primitives/Heading';
import { HomeFeature } from './HomeFeature';

export const FeaturesSection = () => {
	return (
		<div className="mt-5 w-full">
			<Heading.H2 className="text-right">Level up your community</Heading.H2>
			<Heading.H2 className="pt-0 text-right text-lg">Tagline here</Heading.H2>

			<div className="mt-2 grid grid-cols-2 grid-rows-2 gap-10">
				<HomeFeature />
				<HomeFeature />
				<HomeFeature />
				<HomeFeature />
			</div>

			<div className="flex w-full items-center justify-center">
				<Button className="my-16">Add To Server</Button>
			</div>
		</div>
	);
};
