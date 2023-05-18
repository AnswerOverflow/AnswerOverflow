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
	argTypes: {
		collapseContent: {
			control: {
				type: 'range',
				if: {
					arg: 'collapseContent',
				},
				min: 0,
				max: 4000,
				step: 1,
				defaultValue: 0,
			},
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

export const SuperLongMessage: Story = {
	args: {
		...Primary.args,
		message: {
			...mockMessageWithDiscordAccount(),
			// (3674 characters - discord nitro is max 4000 characters)
			content: `Lorem ipsum, dolor sit amet consectetur adipisicing elit. Molestias, et possimus, fuga est itaque impedit laborum labore similique tempora quas atque minus voluptatum explicabo blanditiis magni obcaecati! Error, deleniti id.
        Laboriosam delectus voluptatum asperiores id ullam eius repudiandae eaque, facere iure, corrupti architecto quae! Consectetur dolorem accusamus dolor sint facere perspiciatis nulla esse dignissimos illo? Commodi necessitatibus animi dolores molestiae?
        Dolores itaque repudiandae sequi soluta sapiente repellat atque aspernatur doloribus dolor, totam facilis debitis optio rem asperiores assumenda sit est, quam officiis quod corrupti magni quaerat non beatae reiciendis. Dignissimos?
        Animi odio saepe maiores assumenda provident omnis sed consequuntur vitae, iure obcaecati, consectetur mollitia. Numquam nulla atque suscipit cumque saepe ratione itaque vitae culpa quis, expedita fugit, pariatur earum sit?
        Sit numquam nobis saepe ratione facilis et provident, officia sint quisquam quis nisi voluptate vel eum doloribus voluptates ipsam eligendi dicta magnam quidem dolorem! Nisi delectus saepe numquam laboriosam quaerat!
        Libero fuga ducimus quam eveniet ea. Molestiae sapiente odio libero, porro totam dolore sint voluptatum nobis, animi alias optio illo magnam rerum accusamus labore ducimus odit error esse, non suscipit!
        Fugiat, reprehenderit aperiam commodi saepe ratione esse corrupti qui adipisci dignissimos dolorem animi obcaecati inventore doloribus expedita deleniti ipsam praesentium facilis quae repellat. Nulla deleniti ipsa itaque aspernatur, consequuntur cumque?
        Commodi, quod. Nesciunt sed iure, placeat officia, laborum quis ad culpa excepturi optio corporis, perferendis nisi atque! Qui, autem minima? Laudantium at magnam, veniam reiciendis consequatur debitis fuga illo. Reiciendis!
        Consequatur corporis quo ut, impedit numquam esse eius beatae voluptate tenetur aut veniam expedita voluptatum iusto, perspiciatis commodi laudantium consequuntur quasi architecto voluptates laborum doloribus amet saepe, quaerat repellat. Nesciunt.
        Aliquam impedit illo eos possimus, nisi dicta minus dolorem. Earum, pariatur odit excepturi, cumque, nihil ratione quisquam ipsum architecto consequatur fugiat molestiae et recusandae? Eveniet temporibus asperiores et quibusdam labore.
        Quae fugit repudiandae voluptate voluptates, placeat deserunt impedit molestiae eaque, assumenda sapiente ad mollitia in facere fuga doloribus nesciunt, quibusdam adipisci et. Placeat ea recusandae dolores architecto assumenda eum quam.
        Neque quibusdam eaque quidem, nulla odio id quisquam repellendus voluptates possimus unde. Assumenda possimus quasi fugiat deserunt nam placeat, neque qui sint odio quisquam magnam nemo minima veniam praesentium unde!
        Sit fuga, labore perferendis quibusdam totam laborum dolorum? Magnam, molestias culpa minima, et nobis voluptate ipsum laborum assumenda qui ad reiciendis rem quasi fugiat doloremque adipisci unde optio aut labore.
        Ducimus nam fugiat sit? Facilis ratione ipsa repudiandae blanditiis ducimus animi omnis reiciendis ipsam. Aspernatur possimus sequi consequuntur eos ea distinctio repellat vitae, at atque, cupiditate est repellendus, architecto praesentium.
        Aliquam, sequi quis. Id saepe amet iste dolorum expedita neque a magni optio sint quisquam deserunt dicta, illo alias vel in aliquid cupiditate ab harum! Accusamus repellendus sed recusandae exercitationem.
        Alias voluptas error eius, soluta vitae amet commodi sapiente natus voluptatibus provident cumque reprehenderit. In consectetur explicabo sapiente impedit error, ipsam blanditiis incidunt, ad dolore perferendis cupiditate tempora! Voluptatum, distinctio.`,
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
