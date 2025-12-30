"use client";

import { Button } from "@packages/ui/components/button";
import { Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type FeaturePreviewPlaceholderProps = {
	feature:
		| "indexing"
		| "mark-solution"
		| "auto-thread"
		| "solution-instructions"
		| "solved-tags";
};

const videoUrls: Record<FeaturePreviewPlaceholderProps["feature"], string> = {
	indexing:
		"https://cdn.answeroverflow.com/1450011153030713466/answeroverflow-indexing-demo.mov",
	"mark-solution":
		"https://cdn.answeroverflow.com/1450010686858985482/mark-solution-demo.mov",
	"auto-thread":
		"https://cdn.answeroverflow.com/1450016048261894237/auto-thread-demo.mov",
	"solution-instructions":
		"https://cdn.answeroverflow.com/1450016050950180939/send-mark-solution-instructions.mov",
	"solved-tags":
		"https://cdn.answeroverflow.com/1450016053139869827/solved-tag-demo.mov",
};

export function FeaturePreviewPlaceholder({
	feature,
}: FeaturePreviewPlaceholderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
	const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

	const videoUrl = videoUrls[feature];

	useEffect(() => {
		if (thumbnailVideoRef.current) {
			thumbnailVideoRef.current.playbackRate = 2;
		}
	}, []);

	useEffect(() => {
		if (isOpen && fullscreenVideoRef.current) {
			fullscreenVideoRef.current.playbackRate = 2;
		}
	}, [isOpen]);

	const handleClose = useCallback(() => {
		setIsClosing(true);
		setTimeout(() => {
			setIsOpen(false);
			setIsClosing(false);
		}, 150);
	}, []);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleClose]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) {
				handleClose();
			}
		},
		[handleClose],
	);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsOpen(true);
		}
	}, []);

	if (videoUrl) {
		return (
			<>
				<div className="max-w-sm mx-auto">
					<div
						className="relative rounded-lg overflow-hidden border border-border cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] group"
						onClick={() => setIsOpen(true)}
						onKeyDown={handleKeyDown}
						role="button"
						tabIndex={0}
						aria-label="Expand video demo"
					>
						<video
							ref={thumbnailVideoRef}
							src={videoUrl}
							width={1920}
							height={1080}
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-auto"
						/>
						<div className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/60 text-white/80 group-hover:text-white group-hover:bg-black/80 transition-colors">
							<Expand className="h-4 w-4" />
						</div>
					</div>
					<p className="text-xs text-center text-muted-foreground mt-2">
						Click to expand
					</p>
				</div>

				{isOpen && (
					<div
						className={`fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 transition-opacity duration-150 ${isClosing ? "opacity-0" : "opacity-100"}`}
						onClick={handleBackdropClick}
					>
						<Button
							onClick={handleClose}
							className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
							aria-label="Close video preview"
							variant="ghost"
							size="icon"
						>
							<X className="h-6 w-6" />
						</Button>
						<video
							ref={fullscreenVideoRef}
							src={videoUrl}
							width={1920}
							height={1080}
							autoPlay
							loop
							muted
							playsInline
							className={`max-w-full max-h-full rounded-lg transition-transform duration-150 ${isClosing ? "scale-95" : "scale-100"}`}
						/>
					</div>
				)}
			</>
		);
	}

	return (
		<div
			className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center text-center"
			style={{ aspectRatio: "16/9", maxWidth: "100%" }}
		>
			<div className="text-muted-foreground text-sm">Video placeholder</div>
		</div>
	);
}
