import type { Story } from '@ladle/react';
import { type MessageProps, DemoMessage } from './DemoMessage';
import { mockDiscordAccount } from '~ui/test/props';

import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';

const loremIpsum =
	'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem fugit iure delectus tempore! Nam nihil animi nemo nisi eligendi veniam obcaecati accusantium, sunt maiores tenetur illum saepe incidunt beatae hic.';

//👇 Each story then reuses that template
const defaultMessage: MessageProps = {
	alt: 'John Doe',
	src: 'https://cdn.discordapp.com/avatars/0/0.png',
	message: {
		content: loremIpsum,
		id: '1063028763656458270',
		author: {
			name: 'John Doe',
			id: '0',
			avatar: null,
		},
		parentChannelId: null,
		public: true,
		images: [],
		channelId: '0',
		serverId: '0',
		solutionIds: [],
		messageReference: null,
		attachments: [],
		applicationId: null,
		childThreadId: null,
		mentions: [],
		mentionRoles: [],
		mentionChannels: [],
		mentionEveryone: false,
		nonce: null,
		pinned: false,
		type: 0,
		flags: 0,
		components: [],
		embeds: [],
		reactions: [],
		stickerIds: [],
		webhookId: null,
		tts: false,
		interactionId: null,
	} as APIMessageWithDiscordAccount,
};

// Stories
export const Primary: Story<MessageProps> = (props) => (
	<DemoMessage {...props} />
);
Primary.args = defaultMessage;
export const OverflowLetters = Primary.bind({});
export const WithImages = Primary.bind({});
export const WithCode = Primary.bind({});
export const WithXSS = Primary.bind({});
export const WithXSSInCodeBlock = Primary.bind({});

OverflowLetters.args = {
	...Primary.args,
	message: {
		...defaultMessage.message,
		content:
			'Helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo',
		author: mockDiscordAccount(),
	},
};

WithImages.args = {
	...Primary.args,
	message: {
		...defaultMessage.message,
		channelId: '1031266112802914305',
		serverId: '701008832645824553',
		attachments: [
			{
				url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063119696334966794/image.png',
				width: 897,
				height: 672,
				filename: 'image.png',
				id: '1063028763656458270',
				proxyUrl:
					'https://media.discordapp.net/attachments/1037547270733832242/1063119696334966794/image.png',
				size: 0,
			},
			{
				url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
				width: 1440,
				height: 2560,
				filename: 'image.png',
				id: '1063028763656458270',
				proxyUrl:
					'https://media.discordapp.net/attachments/1037547270733832242/1063121784578261033/image.png',
				size: 0,
			},
			{
				url: 'https://cdn.discordapp.com/attachments/1037547270733832242/1063121784578261033/image.png',
				width: null,
				height: null,
				id: '1063028763656458270',
				proxyUrl:
					'https://media.discordapp.net/attachments/1037547270733832242/1063121784578261033/image.png',
				filename: 'image.png',
				size: 0,
			},
		],
	},
};

WithCode.args = {
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
};

WithXSS.args = {
	...Primary.args,
	message: {
		...defaultMessage.message,
		content: "<script> alert('XSS')</script>",
	},
};

WithXSSInCodeBlock.args = {
	...Primary.args,
	message: {
		...defaultMessage.message,
		content: "```<script> alert('XSS')</script>```",
	},
};
