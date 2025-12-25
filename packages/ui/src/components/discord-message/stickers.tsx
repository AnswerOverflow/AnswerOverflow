"use client";

import type { Sticker } from "@packages/database/convex/schema";
import { useQuery } from "@tanstack/react-query";
import Lottie from "lottie-react";

function getStickerUrl(stickerId: bigint, formatType: number): string {
	switch (formatType) {
		case 1: // PNG
		case 2: // APNG
			return `https://cdn.discordapp.com/stickers/${stickerId}.png`;
		case 3: // Lottie - use proxy to avoid CORS
			return `/api/stickers/${stickerId}.json`;
		case 4: // GIF
			return `https://media.discordapp.net/stickers/${stickerId}.gif`;
		default:
			return `https://cdn.discordapp.com/stickers/${stickerId}.png`;
	}
}

function LottieSticker({ sticker }: { sticker: Sticker }) {
	const stickerUrl = getStickerUrl(sticker.id, sticker.formatType);

	const {
		data: animationData,
		isError,
		isLoading,
	} = useQuery({
		queryKey: ["lottie-sticker", sticker.id.toString()],
		queryFn: () => fetch(stickerUrl).then((res) => res.json()),
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (isError) {
		return (
			<div
				className="flex h-40 w-40 items-center justify-center text-muted-foreground text-sm"
				title={sticker.name}
			>
				[Sticker: {sticker.name}]
			</div>
		);
	}

	if (isLoading) {
		return (
			<div
				className="flex h-40 w-40 items-center justify-center"
				title={sticker.name}
			>
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
			</div>
		);
	}

	return (
		<div
			className="relative h-40 w-40"
			title={sticker.name}
			aria-label={`Sticker: ${sticker.name}`}
		>
			<Lottie
				animationData={animationData}
				loop
				autoplay
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
}

function StickerDisplay({ sticker }: { sticker: Sticker }) {
	const isLottie = sticker.formatType === 3;
	const stickerUrl = getStickerUrl(sticker.id, sticker.formatType);

	if (isLottie) {
		return <LottieSticker sticker={sticker} />;
	}

	return (
		<div className="relative h-40 w-40">
			<img
				src={stickerUrl}
				alt={sticker.name}
				title={sticker.name}
				className="h-full w-full object-contain"
				loading="lazy"
			/>
		</div>
	);
}

export function Stickers({ stickers }: { stickers?: Sticker[] }) {
	if (!stickers?.length) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 py-1">
			{stickers.map((sticker) => (
				<StickerDisplay key={sticker.id.toString()} sticker={sticker} />
			))}
		</div>
	);
}
