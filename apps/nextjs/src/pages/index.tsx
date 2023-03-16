import type { NextPage } from 'next';
import { AOHead, Home } from '@answeroverflow/ui';
// eslint-disable-next-line @typescript-eslint/naming-convention
const HomePage: NextPage = () => {
	return (
		<>
			<AOHead
				description=""
				path="/"
				title="Answer Overflow"
				addPrefix={false}
			/>
			<Home />
		</>
	);
};

export default HomePage;
