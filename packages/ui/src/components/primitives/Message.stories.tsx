import type { Meta, StoryObj } from '@storybook/react';
import { Message } from './Message';
import {
	mockDiscordAccount,
	mockMessageWithDiscordAccount,
} from '~ui/test/props';

const meta = {
	component: Message,
	parameters: {
		a11y: {
			disable: true,
		},
	},
} as Meta<typeof Message>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: { message: mockMessageWithDiscordAccount() },
};

export const OverflowLetters: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			content:
				'Helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo',
			author: mockDiscordAccount(),
		},
	},
};

export const WithSingularImage: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			channelId: '1031266112802914305',
			serverId: '701008832645824553',
			attachments: [
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
					width: 897,
					height: 672,
					filename: 'image.png',
					size: 123456,
					id: '123456789',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
				},
			],
		},
	},
};

export const WithMultipleImages: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			channelId: '1031266112802914305',
			serverId: '701008832645824553',
			attachments: [
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
					width: 897,
					height: 672,
					filename: 'image.png',
					size: 123456,
					id: '123456789',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
					width: 1440,
					height: 2560,
					size: 123456,
					id: '123456789',
					filename: 'image.png',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
					width: null,
					height: null,
					size: 123456,
					filename: 'image.png',
					id: '123456789',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1079799320745877547/1105532764821930095/image.png',
					width: null,
					height: null,
					filename: 'image.png',
					size: 123456,
					id: '123456789',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1079799320745877547/1105532764821930095/image.png',
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1079799320745877547/1105533000881545336/image.png',
					width: null,
					height: null,
					filename: 'image.png',
					size: 123456,
					id: '123456789',
					proxyUrl:
						'https://cdn.discordapp.com/attachments/1079799320745877547/1105533000881545336/image.png',
				},
				{
					url: 'https://media.discordapp.net/attachments/1079799320745877547/1105533166812410018/image.png',
					width: null,
					height: null,
					filename: 'image.png',
					size: 123456,
					id: '123456789',
					proxyUrl:
						'https://media.discordapp.net/attachments/1079799320745877547/1105533166812410018/image.png',
				},
			],
		},
	},
};

export const WithCode: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			content: `
      \`\`\`typescript
    const variable = 'hello';

    function getProfile(id: string): {
      name: string; address: string, photo: string
    } {
      return {
        name: 'ben', address: "ben's house", photo: "/ben.png"
      };
    }
      \`\`\`
    `,
		},
	},
};

export const WithXSS: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			content: "<script> alert('XSS')</script>",
		},
	},
};

export const WithXSSInCodeBlock: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			content: "```<script> alert('XSS')</script>```",
		},
	},
};

export const Blurred: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			public: false,
		},
	},
};

export const WithLink: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			content: 'Maybe try Googling your question first https://google.com',
		},
	},
};
