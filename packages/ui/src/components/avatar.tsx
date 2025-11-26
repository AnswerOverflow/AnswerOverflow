"use client";

import { cn } from "@packages/ui/lib/utils";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";
import { useState } from "react";

export type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root>;

function Avatar({ className, ...props }: AvatarProps) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				"relative flex size-8 shrink-0 overflow-hidden rounded-full",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarImage({
	className,
	src,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	const [imageError, setImageError] = useState(false);

	if (!src) {
		return (
			<AvatarPrimitive.Image
				data-slot="avatar-image"
				className={cn("aspect-square size-full", className)}
				{...props}
			/>
		);
	}

	return (
		<>
			{!imageError && (
				<img
					src={src}
					alt={props.alt}
					width={props.width}
					height={props.height}
					className={cn("aspect-square m-0 size-full", className)}
					// i dunno man, i dunno
					style={{ margin: 0 }}
					onError={() => setImageError(true)}
				/>
			)}
			<AvatarPrimitive.Image
				data-slot="avatar-image"
				className={cn(
					"aspect-square size-full",
					!imageError && "hidden",
					className,
				)}
				src={src}
				{...props}
			/>
		</>
	);
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn(
				"bg-muted flex size-full items-center justify-center rounded-full",
				className,
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarImage, AvatarFallback };
