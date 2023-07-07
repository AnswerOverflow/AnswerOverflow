import type { Story } from '@ladle/react';

import { CommitBannerRenderer } from './CommitBanner';
type CommitBannerProps = React.ComponentPropsWithoutRef<
	typeof CommitBannerRenderer
>;

export const CommitBannerStory: Story<CommitBannerProps> = (props) => {
	return <CommitBannerRenderer {...props} />;
};

CommitBannerStory.args = {
	commitSha: '1234567890abcdef',
};
