import type { Meta, StoryObj } from '@storybook/react';
import { MessageProps, Message } from './Message';
import { mockMessageWithDiscordAccount } from '~ui/test/props';
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

const loremIpsum =
	'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem fugit iure delectus tempore! Nam nihil animi nemo nisi eligendi veniam obcaecati accusantium, sunt maiores tenetur illum saepe incidunt beatae hic.';

//👇 Each story then reuses that template
const defaultMessage: MessageProps = {
	message: mockMessageWithDiscordAccount({
		content: loremIpsum,
	}),
};

export const Primary: Story = {
	args: defaultMessage,
};

export const OverflowLetters: Story = {
	args: {
		...Primary.args,
		message: mockMessageWithDiscordAccount({
			content:
				'Helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo',
		}),
	},
};

export const WithImages: Story = {
	args: {
		...Primary.args,
		message: {
			...defaultMessage.message,
			channelId: '1031266112802914305',
			serverId: '701008832645824553',
			images: [
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
					width: 897,
					height: 672,
					description: null,
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
					width: 1440,
					height: 2560,
					description: null,
				},
				{
					url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
					width: null,
					height: null,
					description: null,
				},
			],
		},
	},
};

export const WithCode: Story = {
	args: {
		...Primary.args,
		message: {
			...defaultMessage.message,
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
			...defaultMessage.message,
			content: "<script> alert('XSS')</script>",
		},
	},
};

export const WithXSSInCodeBlock: Story = {
	args: {
		...Primary.args,
		message: {
			...defaultMessage.message,
			content: "```<script> alert('XSS')</script>```",
		},
	},
};
