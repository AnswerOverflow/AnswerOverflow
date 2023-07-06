import type { Story } from '@ladle/react';
import { mockDiscordAccount } from '~ui/test/props';
import { DiscordAvatar, type DiscordAvatarProps } from './DiscordAvatar';

export const Primary: Story<DiscordAvatarProps> = (props) => <DiscordAvatar {...props} />

Primary.args = {
  size: 'md',
  user: mockDiscordAccount(),
};

export const WithImage = Primary.bind({})

WithImage.args = {
  size: 'md',
  user: mockDiscordAccount({
    avatar: '7716e305f7de26045526d9da6eef2dab',
    id: '523949187663134754',
  }),
};

