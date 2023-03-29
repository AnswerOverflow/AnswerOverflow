import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '~ui/utils/styling';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type ExtraAvatarProps = {
	size?: AvatarSize;
};

export type AvatarProps = React.ComponentPropsWithoutRef<
	typeof AvatarPrimitive.Root
> &
	ExtraAvatarProps;

export function getAvatarSize(size: AvatarSize) {
	switch (size) {
		case 'sm':
			return 40;
		case 'md':
			return 48;
		case 'lg':
			return 64;
		case 'xl':
			return 128;
	}
}

export function getAvatarSizeAsClass(size: AvatarSize) {
	switch (size) {
		case 'sm':
			return 'w-10 h-10 text-sm';
		case 'md':
			return 'w-12 h-12 text-base';
		case 'lg':
			return 'w-16 h-16 text-lg';
		case 'xl':
			return 'w-32 h-32 text-2xl';
	}
}

const Avatar = React.forwardRef<
	React.ElementRef<typeof AvatarPrimitive.Root>,
	AvatarProps
>(({ className, size, ...props }, ref) => (
	<AvatarPrimitive.Root
		ref={ref}
		className={cn(
			'relative flex h-full shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center text-ao-black dark:bg-neutral-700 dark:text-ao-white',
			className,
			getAvatarSizeAsClass(size ?? 'md'),
		)}
		{...props}
	/>
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
	React.ElementRef<typeof AvatarPrimitive.Image>,
	React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, ...props }, ref) => {
	return (
		<AvatarPrimitive.Image
			ref={ref}
			className={cn('aspect-square h-full w-full ', className)}
			src={src}
			alt={alt ?? ''}
			{...props}
		/>
	);
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
	React.ElementRef<typeof AvatarPrimitive.Fallback>,
	React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> &
		ExtraAvatarProps
>(({ className, ...props }, ref) => (
	<AvatarPrimitive.Fallback
		ref={ref}
		className={cn(
			'relative flex h-full shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center dark:bg-neutral-700',
			className,
			getAvatarSizeAsClass(props.size ?? 'md'),
		)}
		{...props}
	/>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
