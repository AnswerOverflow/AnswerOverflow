-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `Account` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`type` varchar(191) NOT NULL,
	`provider` varchar(191) NOT NULL,
	`providerAccountId` varchar(191) NOT NULL,
	`refresh_token` varchar(191),
	`access_token` varchar(191),
	`expires_at` int,
	`token_type` varchar(191),
	`scope` varchar(191),
	`id_token` varchar(191),
	`session_state` varchar(191),
	CONSTRAINT `Account_id` PRIMARY KEY(`id`),
	CONSTRAINT `Account_providerAccountId_key` UNIQUE(`providerAccountId`),
	CONSTRAINT `Account_provider_providerAccountId_key` UNIQUE(`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `Channel` (
	`id` varchar(191) NOT NULL,
	`serverId` varchar(191) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` int NOT NULL,
	`parentId` varchar(191),
	`inviteCode` varchar(15),
	`archivedTimestamp` bigint,
	`bitfield` int unsigned NOT NULL DEFAULT 0,
	`solutionTagId` varchar(191),
	CONSTRAINT `Channel_id` PRIMARY KEY(`id`),
	CONSTRAINT `Channel_inviteCode_key` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `DiscordAccount` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`avatar` varchar(191),
	CONSTRAINT `DiscordAccount_id` PRIMARY KEY(`id`),
	CONSTRAINT `DiscordAccount_id_key` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `IgnoredDiscordAccount` (
	`id` varchar(191) NOT NULL,
	CONSTRAINT `IgnoredDiscordAccount_id` PRIMARY KEY(`id`),
	CONSTRAINT `IgnoredDiscordAccount_id_key` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `Server` (
	`id` varchar(191) NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(45),
	`description` varchar(191),
	`vanityInviteCode` varchar(191),
	`bitfield` int unsigned NOT NULL DEFAULT 0,
	`kickedTime` datetime(3),
	`vanityUrl` varchar(191),
	`customDomain` varchar(191),
	`stripeCustomerId` varchar(191),
	`stripeSubscriptionId` varchar(191),
	`plan` enum('FREE','PRO','ENTERPRISE','OPEN_SOURCE') NOT NULL DEFAULT 'FREE',
	CONSTRAINT `Server_id` PRIMARY KEY(`id`),
	CONSTRAINT `Server_id_key` UNIQUE(`id`),
	CONSTRAINT `Server_vanityInviteCode_key` UNIQUE(`vanityInviteCode`),
	CONSTRAINT `Server_vanityUrl_key` UNIQUE(`vanityUrl`),
	CONSTRAINT `Server_customDomain_key` UNIQUE(`customDomain`),
	CONSTRAINT `Server_stripeCustomerId_key` UNIQUE(`stripeCustomerId`),
	CONSTRAINT `Server_stripeSubscriptionId_key` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
CREATE TABLE `Session` (
	`id` varchar(191) NOT NULL,
	`sessionToken` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`expires` datetime(3) NOT NULL,
	CONSTRAINT `Session_id` PRIMARY KEY(`id`),
	CONSTRAINT `Session_sessionToken_key` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `TenantSession` (
	`id` varchar(191) NOT NULL,
	`serverId` varchar(191) NOT NULL,
	`sessionToken` varchar(191) NOT NULL,
	CONSTRAINT `TenantSession_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191),
	`email` varchar(191),
	`emailVerified` datetime(3),
	`image` varchar(191),
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `UserServerSettings` (
	`userId` varchar(191) NOT NULL,
	`serverId` varchar(191) NOT NULL,
	`bitfield` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `UserServerSettings_serverId_userId` PRIMARY KEY(`serverId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `VerificationToken` (
	`identifier` varchar(191) NOT NULL,
	`token` varchar(191) NOT NULL,
	`expires` datetime(3) NOT NULL,
	CONSTRAINT `VerificationToken_token_key` UNIQUE(`token`),
	CONSTRAINT `VerificationToken_identifier_token_key` UNIQUE(`identifier`,`token`)
);
--> statement-breakpoint
CREATE INDEX `Account_userId_idx` ON `Account` (`userId`);--> statement-breakpoint
CREATE INDEX `Channel_serverId_idx` ON `Channel` (`serverId`);--> statement-breakpoint
CREATE INDEX `Channel_parentId_idx` ON `Channel` (`parentId`);--> statement-breakpoint
CREATE INDEX `Session_userId_idx` ON `Session` (`userId`);--> statement-breakpoint
CREATE INDEX `TenantSession_serverId_idx` ON `TenantSession` (`serverId`);--> statement-breakpoint
CREATE INDEX `TenantSession_sessionToken_idx` ON `TenantSession` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `UserServerSettings_userId_idx` ON `UserServerSettings` (`userId`);--> statement-breakpoint
CREATE INDEX `UserServerSettings_serverId_idx` ON `UserServerSettings` (`serverId`);
*/