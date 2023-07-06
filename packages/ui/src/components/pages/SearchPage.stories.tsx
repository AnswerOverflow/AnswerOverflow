import type { Story } from '@ladle/react';
import { loremIpsum } from 'lorem-ipsum';
import {
  mockChannelWithSettings,
  mockMessageWithDiscordAccount,
  mockServer,
} from '~ui/test/props';
import { PageWrapper } from './PageWrapper';
import { SearchPage } from './SearchPage';

type SearchPageProps = React.ComponentPropsWithoutRef<typeof SearchPage>

const Primary: Story<SearchPageProps> = (props) => (
  <PageWrapper>
    <SearchPage {...props} />
  </PageWrapper>
)

export const NoResults = Primary.bind({})
export const Results = Primary.bind({})
export const ResultsWithSuperLongMessage = Primary.bind({})
export const Loading = Primary.bind({})

Results.args = {
  results: [
    {
      message: {
        ...mockMessageWithDiscordAccount(),
        solutionMessages: [],
        referencedMessage: mockMessageWithDiscordAccount(),
      },
      thread: mockChannelWithSettings(),
      score: 0.5,
      channel: mockChannelWithSettings({
        // AO's Discord server
        inviteCode: 'sxDN2rEdwD',
      }),
      server: mockServer(),
    },
  ],
  isLoading: false,
};

ResultsWithSuperLongMessage.args = {
  results: [
    {
      message: {
        ...mockMessageWithDiscordAccount({
          content: loremIpsum({
            count: 250,
          }),
        }),
        solutionMessages: [],
        referencedMessage: mockMessageWithDiscordAccount(),
      },
      thread: mockChannelWithSettings(),
      score: 0.5,
      channel: mockChannelWithSettings({
        // AO's Discord server
        inviteCode: 'sxDN2rEdwD',
      }),
      server: mockServer(),
    },
  ],
  isLoading: false,
};

Loading.args = {
  isLoading: true,
};

