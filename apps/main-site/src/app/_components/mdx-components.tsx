import { useMDXComponent } from 'next-contentlayer/hooks';

interface MdxProps {
	code: string;
}
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
