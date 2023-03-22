import { Button } from '~ui/components/primitives';
import { Heading } from '~ui/components/primitives/Heading';
import { Paragraph } from '~ui/components/primitives/Paragraph';

const HomeFeature = () => {
	return (
		<div className="flex items-center justify-center rounded-standard border-2 border-white/[.13] bg-[#191B1F] px-20 py-10">
			<Paragraph className="text-2xl">Feature</Paragraph>
		</div>
	);
};

const FeaturesSection = () => {
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

const EndSection = () => {
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

const RoadmapSection = () => {
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

const SearchEngineSection = () => {
	return (
		<div className="mt-20 w-full bg-[#191B1F] p-5">
			<Heading.H2 className="text-4xl">Unleash the power of Google</Heading.H2>
			<Paragraph>
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem dolore
				natus cumque quis optio soluta? Itaque quasi accusamus ex ipsam dolores
				praesentium quas aliquid. Iusto dolores eos soluta quas eaque?
				Voluptatum voluptatibus nisi eos accusamus quisquam quas debitis
				inventore! Nobis maxime fugiat, ipsa velit quisquam, ducimus est
				explicabo aut illum laudantium alias aliquam placeat repellendus
				reprehenderit animi. Omnis, dolores sint.
			</Paragraph>
			<Button>Add to server</Button>
		</div>
	);
};

const SetupSection = () => {
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

export const AboutArea = () => {
	return (
		<div className="flex flex-col items-center px-4 pt-10 pb-20 sm:px-[4rem] 2xl:px-[6rem]">
			<SetupSection />
			<SearchEngineSection />
			<FeaturesSection />
			<RoadmapSection />
			<EndSection />
		</div>
	);
};
