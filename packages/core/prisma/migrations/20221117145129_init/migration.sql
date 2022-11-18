-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(32) NOT NULL,
    `email` VARCHAR(320) NULL,
    `avatar` VARCHAR(45) NULL,
    `created_at` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserChannelSettings` (
    `user_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `settings` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`, `channel_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserServerSettings` (
    `user_id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `settings` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`, `server_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeletedUser` (
    `deleted_user_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`deleted_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Server` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(45) NULL,
    `kicked_time` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServerSettings` (
    `server_id` VARCHAR(191) NOT NULL,
    `settings` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`server_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Channel` (
    `id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelSettings` (
    `channel_id` VARCHAR(191) NOT NULL,
    `settings` INTEGER NOT NULL DEFAULT 0,
    `last_indexed_snowflake` VARCHAR(191) NULL,
    `invite_code` VARCHAR(15) NULL,
    `solution_tag_id` VARCHAR(191) NULL,

    PRIMARY KEY (`channel_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ForumChannelTag` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id`, `channel_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserChannelSettings` ADD CONSTRAINT `UserChannelSettings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserChannelSettings` ADD CONSTRAINT `UserChannelSettings_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserServerSettings` ADD CONSTRAINT `UserServerSettings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserServerSettings` ADD CONSTRAINT `UserServerSettings_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `Server`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Channel` ADD CONSTRAINT `Channel_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `Server`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSettings` ADD CONSTRAINT `ChannelSettings_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumChannelTag` ADD CONSTRAINT `ForumChannelTag_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
