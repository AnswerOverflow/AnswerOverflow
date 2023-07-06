import type { Story } from '@ladle/react';
import { BrowseCommunitiesRenderer } from './BrowseCommunitiesPage';
import { mockServer } from '~ui/test/props';
import { PageWrapper } from './PageWrapper';

type BrowseCommunitiesRenderProps = React.ComponentPropsWithoutRef<typeof BrowseCommunitiesRenderer>

// Mock 10 servers
const servers = Array.from({ length: 10 }, () => mockServer());

export const Primary: Story<BrowseCommunitiesRenderProps> = (props) => {
  return (
    <PageWrapper>
      <BrowseCommunitiesRenderer {...props} />
    </PageWrapper>
  )
}

Primary.args = {
  servers
}

