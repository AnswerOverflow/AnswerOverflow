import type { NextPage } from 'next';
import { AOHead, Home } from '@answeroverflow/ui';
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
