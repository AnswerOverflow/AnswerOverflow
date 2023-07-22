import type { Story } from '@ladle/react';
import { BrowseCommunitiesRenderer } from './BrowseCommunitiesPage';
import { mockPublicServer } from '~ui/test/props';
import { PageWrapper } from './PageWrapper';

type BrowseCommunitiesRenderProps = React.ComponentPropsWithoutRef<
	typeof BrowseCommunitiesRenderer
>;

// Mock 10 servers
const servers = Array.from({ length: 10 }, () => mockPublicServer());

export const Primary: Story<BrowseCommunitiesRenderProps> = (props) => {
	return (
		<PageWrapper>
			<BrowseCommunitiesRenderer {...props} />
		</PageWrapper>
	);
};

Primary.args = {
	servers,
};
