"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { cn } from "@packages/ui/lib/utils";
import { useMutation } from "convex/react";
import { ImageIcon, LoaderCircle, Trash2, Upload, User } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

type BotCustomizationData = {
	nickname: string | null;
	avatarStorageId: Id<"_storage"> | null;
	avatarUrl: string | null;
	bannerStorageId: Id<"_storage"> | null;
	bannerUrl: string | null;
	bio: string | null;
};

export type BotCustomizationProps = {
	className?: string;
	serverId: bigint;
	data: BotCustomizationData;
};

function ImageUpload({
	type,
	currentUrl,
	onUpload,
	onRemove,
	uploading,
}: {
	type: "avatar" | "banner";
	currentUrl: string | null;
	onUpload: (file: File) => Promise<void>;
	onRemove: () => void;
	uploading: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
		if (!validTypes.includes(file.type)) {
			alert("Please upload a PNG, JPEG, GIF, or WebP image");
			return;
		}

		const maxSize = type === "avatar" ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
		if (file.size > maxSize) {
			alert(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
			return;
		}

		await onUpload(file);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const isAvatar = type === "avatar";
	const containerClass = isAvatar
		? "h-24 w-24 rounded-full"
		: "h-32 w-full rounded-lg";
	const placeholderClass = isAvatar
		? "h-24 w-24 rounded-full"
		: "h-32 w-full rounded-lg";

	return (
		<div className="space-y-2">
			<Label>{isAvatar ? "Avatar" : "Banner"}</Label>
			<div className="flex items-center gap-4">
				<div
					className={cn(
						"relative overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-muted/50",
						containerClass,
					)}
				>
					{currentUrl ? (
						<img
							src={currentUrl}
							alt={`Bot ${type}`}
							className="h-full w-full object-cover"
						/>
					) : (
						<div
							className={cn(
								"flex items-center justify-center text-muted-foreground",
								placeholderClass,
							)}
						>
							{isAvatar ? (
								<User className="h-8 w-8" />
							) : (
								<ImageIcon className="h-8 w-8" />
							)}
						</div>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<input
						ref={inputRef}
						type="file"
						accept="image/png,image/jpeg,image/gif,image/webp"
						className="hidden"
						onChange={handleFileChange}
						disabled={uploading}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? (
							<LoaderCircle className="h-4 w-4 animate-spin" />
						) : (
							<Upload className="h-4 w-4" />
						)}
						{currentUrl ? "Change" : "Upload"}
					</Button>
					{currentUrl && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onRemove}
							disabled={uploading}
							className="text-destructive hover:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
							Remove
						</Button>
					)}
				</div>
			</div>
			<p className="text-xs text-muted-foreground">
				{isAvatar
					? "Recommended: 1024x1024 or smaller. Max 8MB."
					: "Recommended: 600x240. Max 10MB."}
			</p>
		</div>
	);
}

export function BotCustomization({
	serverId,
	data,
	className,
}: BotCustomizationProps) {
	const [nickname, setNickname] = useState(data.nickname ?? "");
	const [bio, setBio] = useState(data.bio ?? "");
	const [avatarUrl, setAvatarUrl] = useState(data.avatarUrl);
	const [bannerUrl, setBannerUrl] = useState(data.bannerUrl);
	const [, setAvatarStorageId] = useState(data.avatarStorageId);
	const [, setBannerStorageId] = useState(data.bannerStorageId);
	const [saving, setSaving] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [uploadingBanner, setUploadingBanner] = useState(false);

	const generateUploadUrl = useMutation(
		api.authenticated.dashboard_mutations.generateBotCustomizationUploadUrl,
	);
	const updateBotCustomization = useMutation(
		api.authenticated.dashboard_mutations.updateBotCustomization,
	);

	const uploadImage = async (file: File, type: "avatar" | "banner") => {
		const setUploading =
			type === "avatar" ? setUploadingAvatar : setUploadingBanner;
		setUploading(true);

		try {
			const uploadUrl = await generateUploadUrl({ serverId, type });

			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			if (!response.ok) {
				throw new Error("Upload failed");
			}

			const { storageId } = await response.json();

			if (type === "avatar") {
				setAvatarStorageId(storageId);
				setAvatarUrl(URL.createObjectURL(file));
			} else {
				setBannerStorageId(storageId);
				setBannerUrl(URL.createObjectURL(file));
			}

			await updateBotCustomization({
				serverId,
				...(type === "avatar"
					? { botAvatarStorageId: storageId }
					: { botBannerStorageId: storageId }),
			});
		} catch (error) {
			console.error("Upload error:", error);
			alert("Failed to upload image. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	const removeImage = async (type: "avatar" | "banner") => {
		if (type === "avatar") {
			setAvatarStorageId(null);
			setAvatarUrl(null);
		} else {
			setBannerStorageId(null);
			setBannerUrl(null);
		}

		await updateBotCustomization({
			serverId,
			...(type === "avatar"
				? { botAvatarStorageId: null }
				: { botBannerStorageId: null }),
		});
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await updateBotCustomization({
				serverId,
				botNickname: nickname || null,
				botBio: bio || null,
			});
		} catch (error) {
			console.error("Save error:", error);
			alert("Failed to save. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const hasChanges =
		nickname !== (data.nickname ?? "") || bio !== (data.bio ?? "");

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Bot Customization</CardTitle>
				<CardDescription>
					Customize how the bot appears in this server. Changes will be synced
					to Discord automatically.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="bot-nickname">Nickname</Label>
					<Input
						id="bot-nickname"
						placeholder="AnswerOverflow"
						value={nickname}
						onChange={(e) => setNickname(e.target.value)}
						maxLength={32}
					/>
					<p className="text-xs text-muted-foreground">
						The name displayed for the bot in this server. Leave empty to use
						the default.
					</p>
				</div>

				<ImageUpload
					type="avatar"
					currentUrl={avatarUrl}
					onUpload={(file) => uploadImage(file, "avatar")}
					onRemove={() => removeImage("avatar")}
					uploading={uploadingAvatar}
				/>

				<ImageUpload
					type="banner"
					currentUrl={bannerUrl}
					onUpload={(file) => uploadImage(file, "banner")}
					onRemove={() => removeImage("banner")}
					uploading={uploadingBanner}
				/>

				<div className="space-y-2">
					<Label htmlFor="bot-bio">Bio</Label>
					<Textarea
						id="bot-bio"
						placeholder="A helpful bot for managing your community..."
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={190}
						rows={3}
					/>
					<p className="text-xs text-muted-foreground">
						A short description shown on the bot&apos;s profile. Max 190
						characters.
					</p>
				</div>

				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={saving || !hasChanges}>
						{saving ? (
							<>
								<LoaderCircle className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
