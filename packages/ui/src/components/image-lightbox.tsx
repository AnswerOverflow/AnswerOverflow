"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

type ImageData = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
};

type ImageLightboxProps = {
	images: ImageData[];
	initialIndex?: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ImageLightbox({
	images,
	initialIndex = 0,
	open,
	onOpenChange,
}: ImageLightboxProps) {
	const prevOpen = useRef(open);
	const [currentIndex, setCurrentIndex] = useState(() =>
		Math.max(0, Math.min(initialIndex, images.length - 1)),
	);
	const [isZoomed, setIsZoomed] = useState(false);

	if (open && !prevOpen.current) {
		const safeIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
		if (currentIndex !== safeIndex) {
			setCurrentIndex(safeIndex);
		}
		if (isZoomed) {
			setIsZoomed(false);
		}
	}
	prevOpen.current = open;

	const currentImage = images[currentIndex];
	const hasMultipleImages = images.length > 1;

	const goToPrevious = useCallback(() => {
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
		setIsZoomed(false);
	}, [images.length]);

	const goToNext = useCallback(() => {
		setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
		setIsZoomed(false);
	}, [images.length]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				goToPrevious();
			} else if (e.key === "ArrowRight") {
				goToNext();
			}
		},
		[goToPrevious, goToNext],
	);

	const handleDownload = useCallback(async () => {
		if (!currentImage) return;
		try {
			const response = await fetch(currentImage.src);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = currentImage.alt || "image";
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			window.open(currentImage.src, "_blank");
		}
	}, [currentImage]);

	const toggleZoom = useCallback(() => {
		setIsZoomed((prev) => !prev);
	}, []);

	if (!currentImage) return null;

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
					onClick={() => onOpenChange(false)}
				/>
				<DialogPrimitive.Content
					className="fixed inset-0 z-50 flex items-center justify-center outline-none pointer-events-none"
					onKeyDown={handleKeyDown}
					aria-describedby={undefined}
				>
					<DialogPrimitive.Title className="sr-only">
						{currentImage.alt || "Image viewer"}
					</DialogPrimitive.Title>

					<div className="pointer-events-auto absolute top-4 right-4 z-10 flex gap-2">
						<Button
							variant="ghost"
							size="icon"
							className="size-10 rounded-full bg-black/50 text-white hover:bg-black/70"
							onClick={handleDownload}
						>
							<Download className="size-5" />
							<span className="sr-only">Download image</span>
						</Button>
						<DialogPrimitive.Close asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-10 rounded-full bg-black/50 text-white hover:bg-black/70"
							>
								<X className="size-5" />
								<span className="sr-only">Close</span>
							</Button>
						</DialogPrimitive.Close>
					</div>

					{hasMultipleImages && (
						<>
							<Button
								variant="ghost"
								size="icon"
								className="pointer-events-auto absolute left-4 z-10 size-12 rounded-full bg-black/50 text-white hover:bg-black/70"
								onClick={goToPrevious}
							>
								<ChevronLeft className="size-8" />
								<span className="sr-only">Previous image</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="pointer-events-auto absolute right-4 z-10 size-12 rounded-full bg-black/50 text-white hover:bg-black/70"
								onClick={goToNext}
							>
								<ChevronRight className="size-8" />
								<span className="sr-only">Next image</span>
							</Button>
						</>
					)}

					<div
						className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-hidden"
						onClick={() => onOpenChange(false)}
					>
						<img
							src={currentImage.src}
							alt={currentImage.alt}
							className={cn(
								"object-contain select-none transition-transform duration-300 ease-out origin-center",
								isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
							)}
							style={{
								maxWidth: "55vw",
								maxHeight: "55vh",
								transform: isZoomed ? "scale(1.75)" : "scale(1)",
							}}
							draggable={false}
							onClick={(e) => {
								e.stopPropagation();
								toggleZoom();
							}}
						/>
					</div>

					{hasMultipleImages && (
						<div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
							{images.map((_, idx) => (
								<button
									key={idx}
									type="button"
									aria-label={`Go to image ${idx + 1} of ${images.length}`}
									className={cn(
										"size-2 rounded-full transition-colors",
										idx === currentIndex
											? "bg-white"
											: "bg-white/50 hover:bg-white/75",
									)}
									onClick={() => {
										setCurrentIndex(idx);
										setIsZoomed(false);
									}}
								>
									<span className="sr-only">Go to image {idx + 1}</span>
								</button>
							))}
						</div>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

type ExpandableImageProps = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	containerClassName?: string;
	style?: React.CSSProperties;
	containerStyle?: React.CSSProperties;
};

export function ExpandableImage({
	src,
	alt,
	width,
	height,
	className,
	containerClassName,
	style,
	containerStyle,
}: ExpandableImageProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<div
				className={cn("cursor-pointer", containerClassName)}
				style={containerStyle}
				onClick={() => setIsOpen(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsOpen(true);
					}
				}}
				role="button"
				tabIndex={0}
			>
				<img
					src={src}
					alt={alt}
					width={width}
					height={height}
					className={className}
					style={style}
					loading="lazy"
				/>
			</div>
			<ImageLightbox
				images={[{ src, alt, width, height }]}
				open={isOpen}
				onOpenChange={setIsOpen}
			/>
		</>
	);
}

type ExpandableImageGalleryProps = {
	images: ImageData[];
	renderImage: (
		image: ImageData,
		index: number,
		onClick: () => void,
	) => React.ReactNode;
};

export function ExpandableImageGallery({
	images,
	renderImage,
}: ExpandableImageGalleryProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const handleImageClick = (index: number) => {
		setSelectedIndex(index);
		setIsOpen(true);
	};

	return (
		<>
			{images.map((image, idx) =>
				renderImage(image, idx, () => handleImageClick(idx)),
			)}
			<ImageLightbox
				images={images}
				initialIndex={selectedIndex}
				open={isOpen}
				onOpenChange={setIsOpen}
			/>
		</>
	);
}
