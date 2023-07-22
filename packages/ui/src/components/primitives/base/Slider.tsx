/* eslint-disable tailwindcss/no-custom-classname */
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '~ui/utils/styling';

// eslint-disable-next-line react/display-name
export const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
	return (
		<SliderPrimitive.Root
			ref={ref}
			className={cn(
				'relative flex w-full cursor-pointer touch-none select-none items-center',
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-ao-black/5 dark:bg-ao-white/25">
				<SliderPrimitive.Range className="absolute h-full bg-ao-black dark:bg-ao-white" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb className="ring-offset-background focus-visible:ring-ring block h-5 w-5 rounded-full border-2 border-ao-white bg-ao-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-ao-black dark:bg-ao-white" />
		</SliderPrimitive.Root>
	);
});
