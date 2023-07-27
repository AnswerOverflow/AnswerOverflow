import type { NextPage } from 'next';
import AOHead from '@answeroverflow/ui/src/components/primitives/AOHead';
import { Home } from '@answeroverflow/ui/src/components/pages/Home';
// eslint-disable-next-line @typescript-eslint/naming-convention
const HomePage: NextPage = () => {
	return (
		<>
			<AOHead
				path="/"
				title="Answer Overflow - Index Your Discord Server Channels Into Google"
				addPrefix={false}
			/>
			<Home />
		</>
	);
};

export default HomePage;
