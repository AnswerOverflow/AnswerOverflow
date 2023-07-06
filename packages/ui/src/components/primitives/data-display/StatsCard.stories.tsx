import type { Story } from '@ladle/react';
import { StatsCard, type StatsCardProps } from './StatsCard';

export const Primary: Story<StatsCardProps> = (props) => <StatsCard {...props} />

Primary.args = {
  title: 'Questions asked',
  stat: '123',
  percentageChange: '12.52%',
  changeType: 'decrease',
  changeCount: '12',
  changeDuration: '15 days',
};

Primary.argTypes = {
  changeType: {
    control: {
      type: "radio"
    },
    options: ["increase", "decrease"]
  }
}

