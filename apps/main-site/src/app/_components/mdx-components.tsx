import { useMDXComponent } from 'next-contentlayer/hooks';

interface MdxProps {
	code: string;
}

// eslint-disable-next-line @next/next/no-img-element,jsx-a11y/alt-text
const Image = (props: any) => <img {...props} />;

export function Mdx({ code }: MdxProps) {
	const Component = useMDXComponent(code);

	return (
		<Component
			components={{
				Image,
			}}
		/>
	);
}
