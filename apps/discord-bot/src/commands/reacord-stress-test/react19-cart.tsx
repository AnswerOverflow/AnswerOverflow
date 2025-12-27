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
import { useActionState, useOptimistic, useState, useTransition } from "react";

interface CartItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
	pending?: boolean;
}

interface CartState {
	items: CartItem[];
	lastAction: string;
	error: string | null;
}

const PRODUCTS = [
	{ id: "prod_1", name: "Discord Nitro", price: 9.99 },
	{ id: "prod_2", name: "Server Boost", price: 4.99 },
	{ id: "prod_3", name: "Premium Stickers", price: 2.99 },
	{ id: "prod_4", name: "Custom Emoji Pack", price: 1.99 },
];

async function processCartAction(
	prevState: CartState,
	action: { type: "add" | "remove" | "clear"; productId?: string },
): Promise<CartState> {
	await new Promise((resolve) => setTimeout(resolve, 1200));

	if (Math.random() < 0.1) {
		return {
			...prevState,
			error: "Transaction failed - please try again",
			lastAction: `Failed: ${action.type}`,
		};
	}

	switch (action.type) {
		case "add": {
			const product = PRODUCTS.find((p) => p.id === action.productId);
			if (!product)
				return {
					...prevState,
					error: "Product not found",
					lastAction: "Error",
				};

			const existing = prevState.items.find((i) => i.id === product.id);
			if (existing) {
				return {
					items: prevState.items.map((i) =>
						i.id === product.id
							? { ...i, quantity: i.quantity + 1, pending: false }
							: i,
					),
					lastAction: `Added ${product.name}`,
					error: null,
				};
			}
			return {
				items: [
					...prevState.items,
					{ ...product, quantity: 1, pending: false },
				],
				lastAction: `Added ${product.name}`,
				error: null,
			};
		}
		case "remove": {
			const item = prevState.items.find((i) => i.id === action.productId);
			if (!item) return prevState;

			if (item.quantity > 1) {
				return {
					items: prevState.items.map((i) =>
						i.id === action.productId
							? { ...i, quantity: i.quantity - 1, pending: false }
							: i,
					),
					lastAction: `Removed 1x ${item.name}`,
					error: null,
				};
			}
			return {
				items: prevState.items.filter((i) => i.id !== action.productId),
				lastAction: `Removed ${item.name}`,
				error: null,
			};
		}
		case "clear":
			return {
				items: [],
				lastAction: "Cleared cart",
				error: null,
			};
		default:
			return prevState;
	}
}

export function React19CartScenario() {
	const instance = useInstance();
	const [selectedProduct, setSelectedProduct] = useState<string>(
		PRODUCTS[0]?.id ?? "",
	);
	const [isPending, startTransition] = useTransition();

	const [cartState, cartAction, isActionPending] = useActionState(
		processCartAction,
		{ items: [], lastAction: "Cart initialized", error: null },
	);

	const [optimisticItems, addOptimisticItem] = useOptimistic(
		cartState.items,
		(state, action: { type: "add" | "remove"; productId: string }) => {
			if (action.type === "add") {
				const product = PRODUCTS.find((p) => p.id === action.productId);
				if (!product) return state;
				const existing = state.find((i) => i.id === product.id);
				if (existing) {
					return state.map((i) =>
						i.id === product.id
							? { ...i, quantity: i.quantity + 1, pending: true }
							: i,
					);
				}
				return [...state, { ...product, quantity: 1, pending: true }];
			}
			const item = state.find((i) => i.id === action.productId);
			if (!item) return state;
			if (item.quantity > 1) {
				return state.map((i) =>
					i.id === action.productId
						? { ...i, quantity: i.quantity - 1, pending: true }
						: i,
				);
			}
			return state.filter((i) => i.id !== action.productId);
		},
	);

	const total = optimisticItems.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);
	const itemCount = optimisticItems.reduce(
		(sum, item) => sum + item.quantity,
		0,
	);

	const handleAdd = () => {
		if (!selectedProduct) return;
		startTransition(() => {
			addOptimisticItem({ type: "add", productId: selectedProduct });
			cartAction({ type: "add", productId: selectedProduct });
		});
	};

	const handleRemove = (productId: string) => {
		startTransition(() => {
			addOptimisticItem({ type: "remove", productId });
			cartAction({ type: "remove", productId });
		});
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: Shopping Cart Demo</TextDisplay>
				<TextDisplay>
					Combines `useOptimistic`, `useActionState`, and `useTransition` for a
					seamless shopping experience. ~10% failure rate.
				</TextDisplay>
			</Container>

			<Container
				accentColor={isPending || isActionPending ? 0xfee75c : 0x57f287}
			>
				<TextDisplay>
					**Status:**{" "}
					{isPending || isActionPending ? "⏳ Processing..." : "✓ Ready"}
				</TextDisplay>
				<TextDisplay>**Last action:** {cartState.lastAction}</TextDisplay>
			</Container>

			{cartState.error && (
				<Container accentColor={0xed4245}>
					<TextDisplay>**Error:** {cartState.error}</TextDisplay>
				</Container>
			)}

			<Separator />

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Shopping Cart ({itemCount} items)</TextDisplay>
				{optimisticItems.length === 0 ? (
					<TextDisplay>_Your cart is empty_</TextDisplay>
				) : (
					optimisticItems.map((item) => (
						<Section
							key={item.id}
							accessory={{
								type: "button",
								label: "−",
								style: "danger",
								disabled: isPending || isActionPending,
								onClick: () => handleRemove(item.id),
							}}
						>
							<TextDisplay>
								{item.pending ? "⏳ " : ""}**{item.name}** × {item.quantity}
							</TextDisplay>
							<TextDisplay>
								${(item.price * item.quantity).toFixed(2)}
							</TextDisplay>
						</Section>
					))
				)}
				<Separator spacing="small" />
				<TextDisplay>**Total:** ${total.toFixed(2)}</TextDisplay>
			</Container>

			<Separator />

			<Container accentColor={0x99aab5}>
				<TextDisplay>### Add Product</TextDisplay>
			</Container>

			<Select
				placeholder="Select a product"
				value={selectedProduct}
				onSelect={(value) => setSelectedProduct(value)}
			>
				{PRODUCTS.map((product) => (
					<Option
						key={product.id}
						value={product.id}
						label={product.name}
						description={`$${product.price.toFixed(2)}`}
					/>
				))}
			</Select>

			<ActionRow>
				<Button
					label={isPending || isActionPending ? "Adding..." : "Add to Cart"}
					style="success"
					disabled={isPending || isActionPending || !selectedProduct}
					onClick={handleAdd}
				/>
				<Button
					label="Clear Cart"
					style="secondary"
					disabled={
						isPending || isActionPending || optimisticItems.length === 0
					}
					onClick={() => cartAction({ type: "clear" })}
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
