import { EndSection } from './EndSection';
import { FeaturesSection } from './FeaturesSection';
import { RoadmapSection } from './RoadmapSection';
import { SearchEngineSection } from './SearchEngineSection';
import { SetupSection } from './SetupSection';

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
