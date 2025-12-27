import {
	ActionRow,
	Button,
	Container,
	MediaGallery,
	MediaGalleryItem,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function ImageGalleryScenario() {
	const [currentPage, setCurrentPage] = useState(0);
	const instance = useInstance();

	const galleries = [
		{
			title: "Nature",
			images: [
				"https://picsum.photos/seed/nature1/400/300",
				"https://picsum.photos/seed/nature2/400/300",
				"https://picsum.photos/seed/nature3/400/300",
				"https://picsum.photos/seed/nature4/400/300",
			],
		},
		{
			title: "City",
			images: [
				"https://picsum.photos/seed/city1/400/300",
				"https://picsum.photos/seed/city2/400/300",
				"https://picsum.photos/seed/city3/400/300",
				"https://picsum.photos/seed/city4/400/300",
			],
		},
		{
			title: "Abstract",
			images: [
				"https://picsum.photos/seed/abstract1/400/300",
				"https://picsum.photos/seed/abstract2/400/300",
				"https://picsum.photos/seed/abstract3/400/300",
				"https://picsum.photos/seed/abstract4/400/300",
			],
		},
	];

	const current = galleries[currentPage];
	if (!current) return null;

	return (
		<>
			<Container accentColor={0xeb459e}>
				<TextDisplay>## Photo Gallery</TextDisplay>
				<TextDisplay>
					**Category:** {current.title} | **Page:** {currentPage + 1}/
					{galleries.length}
				</TextDisplay>
			</Container>

			<MediaGallery>
				{current.images.map((url, i) => (
					<MediaGalleryItem key={i} url={url} />
				))}
			</MediaGallery>

			<ActionRow>
				<Button
					label="Previous"
					style="secondary"
					disabled={currentPage === 0}
					onClick={() => setCurrentPage((p) => p - 1)}
				/>
				<Button
					label="Next"
					style="secondary"
					disabled={currentPage === galleries.length - 1}
					onClick={() => setCurrentPage((p) => p + 1)}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
