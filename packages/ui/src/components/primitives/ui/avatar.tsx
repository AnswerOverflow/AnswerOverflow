import { cn } from '../../../utils/utils';

export type AvatarProps = {
	size?: number;
	className?: string;
	src?: string;
	children?: React.ReactNode;
	style?: React.CSSProperties;
	alt?: string;
	width?: number;
	height?: number;
};

const Avatar = ({ className, ...props }: AvatarProps) => (
	<div
		className={cn(
			'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
			className,
		)}
		{...props}
	/>
);

const AvatarImage = ({ className, ...props }: AvatarProps) => (
	// eslint-disable-next-line @next/next/no-img-element,jsx-a11y/alt-text
	<img
		loading={'lazy'}
		fetchPriority={'low'}
		className={cn('aspect-square h-full w-full', className)}
		{...props}
	/>
);

const AvatarFallback = ({ className, ...props }: AvatarProps) => (
	<span
		className={cn(
			'flex h-full w-full items-center justify-center rounded-full bg-muted',
			className,
		)}
		{...props}
	/>
);

export { Avatar, AvatarImage, AvatarFallback };
