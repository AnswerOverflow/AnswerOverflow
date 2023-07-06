import type { Story } from '@ladle/react';
import { mockServer } from '~ui/test/props';
import { ServerCard, ViewServerCard, type ServerCardProps } from './ServerCard';

type ViewServerCardProps = React.ComponentPropsWithoutRef<typeof ViewServerCard>

export const BaseCard: Story<ServerCardProps> = (props) => <ServerCard {...props} />
BaseCard.args = {
  server: mockServer({
    name: 'AnswerOverflow',
    id: '952724385238761475',
    icon: '4e610bdea5aacf259013ed8cada0bc1d',
  }),
};

export const ViewCard: Story<ViewServerCardProps> = (props) => <ViewServerCard {...props} />
ViewCard.args = {
  server: mockServer({
    name: 'AnswerOverflow',
    id: '952724385238761475',
    icon: '4e610bdea5aacf259013ed8cada0bc1d',
  }),
};

