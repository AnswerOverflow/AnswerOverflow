import {
	ActionRow,
	Button,
	Container,
	Option,
	Section,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function ProductCardScenario() {
	const [quantity, setQuantity] = useState(1);
	const [selectedSize, setSelectedSize] = useState<string | null>(null);
	const instance = useInstance();

	const price = 29.99;
	const total = (price * quantity).toFixed(2);

	return (
		<>
			<Container accentColor={0x5865f2}>
				<Section
					accessory={{
						type: "thumbnail",
						url: "https://cdn.discordapp.com/embed/avatars/0.png",
					}}
				>
					<TextDisplay>## Discord Hoodie</TextDisplay>
					<TextDisplay>
						Premium quality hoodie with embroidered Discord logo. Super
						comfortable for those long coding sessions.
					</TextDisplay>
				</Section>
				<Separator spacing="small" />
				<TextDisplay>
					**Price:** ${price} | **Quantity:** {quantity} | **Total:** ${total}
				</TextDisplay>
				{selectedSize && <TextDisplay>**Size:** {selectedSize}</TextDisplay>}
			</Container>

			<Select
				placeholder="Select size"
				value={selectedSize ?? undefined}
				onSelect={(value) => setSelectedSize(value)}
			>
				<Option value="S" label="Small" description="Fits chest 34-36 inches" />
				<Option
					value="M"
					label="Medium"
					description="Fits chest 38-40 inches"
				/>
				<Option value="L" label="Large" description="Fits chest 42-44 inches" />
				<Option
					value="XL"
					label="Extra Large"
					description="Fits chest 46-48 inches"
				/>
			</Select>

			<ActionRow>
				<Button
					label="-"
					style="secondary"
					disabled={quantity <= 1}
					onClick={() => setQuantity((q) => Math.max(1, q - 1))}
				/>
				<Button
					label={`Qty: ${quantity}`}
					style="secondary"
					disabled={true}
					onClick={() => {}}
				/>
				<Button
					label="+"
					style="secondary"
					disabled={quantity >= 10}
					onClick={() => setQuantity((q) => Math.min(10, q + 1))}
				/>
				<Button
					label="Add to Cart"
					style="success"
					disabled={!selectedSize}
					onClick={() => instance.destroy()}
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
