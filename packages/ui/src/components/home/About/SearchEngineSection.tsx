import { Button } from '../../primitives';
import { Heading } from '../../primitives/Heading';
import { Paragraph } from '../../primitives/Paragraph';

export const SearchEngineSection = () => {
	return (
		<div className="mt-20 w-full bg-[#191B1F] p-5">
			<Heading.H2 className="text-4xl">Unleash the power of Google</Heading.H2>
			<Paragraph>
				Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem dolore
				natus cumque quis optio soluta? Itaque quasi accusamus ex ipsam dolores
				praesentium quas aliquid. Iusto dolores eos soluta quas eaque?
				Voluptatum voluptatibus nisi eos accusamus quisquam quas debitis
				inventore! Nobis maxime fugiat, ipsa velit quisquam, ducimus est
				explicabo aut illum laudantium alias aliquam placeat repellendus
				reprehenderit animi. Omnis, dolores sint.
			</Paragraph>
			<Button>Add to server</Button>
		</div>
	);
};
