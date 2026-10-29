-- AlterTable
ALTER TABLE `User` ADD COLUMN `wholesaleApproved` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `CatalogLock` (
    `id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogImport` (
    `idempotencyKey` VARCHAR(100) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `digest` CHAR(64) NOT NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idempotencyKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `parentId` CHAR(36) NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `categoryId` CHAR(36) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    `kind` VARCHAR(16) NOT NULL DEFAULT 'PHYSICAL',
    `currency` CHAR(3) NOT NULL DEFAULT 'NGN',
    `digitalFormat` VARCHAR(50) NULL,
    `digitalBytes` INTEGER NULL,
    `digitalAssetKey` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    INDEX `Product_status_currency_createdAt_idx`(`status`, `currency`, `createdAt`),
    INDEX `Product_categoryId_status_idx`(`categoryId`, `status`),
    INDEX `Product_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `url` VARCHAR(1000) NOT NULL,
    `alt` VARCHAR(200) NOT NULL,
    `position` INTEGER NOT NULL,

    UNIQUE INDEX `ProductImage_productId_position_key`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `size` VARCHAR(40) NOT NULL DEFAULT '',
    `colour` VARCHAR(40) NOT NULL DEFAULT '',
    `style` VARCHAR(40) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `priceMinor` INTEGER NOT NULL,
    `salePriceMinor` INTEGER NULL,
    `saleStartsAt` DATETIME(3) NULL,
    `saleEndsAt` DATETIME(3) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 5,
    `stockPolicy` VARCHAR(16) NOT NULL DEFAULT 'DENY',
    `preorderAvailableAt` DATETIME(3) NULL,

    UNIQUE INDEX `ProductVariant_sku_key`(`sku`),
    INDEX `ProductVariant_productId_active_priceMinor_idx`(`productId`, `active`, `priceMinor`),
    INDEX `ProductVariant_active_stock_idx`(`active`, `stock`),
    UNIQUE INDEX `ProductVariant_productId_size_colour_style_key`(`productId`, `size`, `colour`, `style`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceTier` (
    `id` CHAR(36) NOT NULL,
    `variantId` CHAR(36) NOT NULL,
    `minQuantity` INTEGER NOT NULL,
    `priceMinor` INTEGER NOT NULL,

    UNIQUE INDEX `PriceTier_variantId_minQuantity_key`(`variantId`, `minQuantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAdjustment` (
    `id` CHAR(36) NOT NULL,
    `variantId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `idempotencyKey` VARCHAR(100) NOT NULL,
    `delta` INTEGER NOT NULL,
    `resultingStock` INTEGER NOT NULL,
    `reason` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StockAdjustment_idempotencyKey_key`(`idempotencyKey`),
    INDEX `StockAdjustment_variantId_createdAt_idx`(`variantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WishlistItem` (
    `userId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WishlistItem_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`userId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecentlyViewed` (
    `userId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecentlyViewed_userId_viewedAt_idx`(`userId`, `viewedAt`),
    PRIMARY KEY (`userId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductReview` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `rating` INTEGER NOT NULL,
    `body` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductReview_productId_status_createdAt_idx`(`productId`, `status`, `createdAt`),
    INDEX `ProductReview_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `ProductReview_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CmsContent` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `body` TEXT NOT NULL,
    `imageUrl` VARCHAR(1000) NULL,
    `targetPath` VARCHAR(200) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CmsContent_slug_key`(`slug`),
    INDEX `CmsContent_kind_published_idx`(`kind`, `published`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceTier` ADD CONSTRAINT `PriceTier_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustment` ADD CONSTRAINT `StockAdjustment_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecentlyViewed` ADD CONSTRAINT `RecentlyViewed_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecentlyViewed` ADD CONSTRAINT `RecentlyViewed_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Single catalogue mutex, always acquired after the current account lock.
INSERT INTO `CatalogLock` (`id`) VALUES (1);

-- Defense in depth for direct SQL and future callers (MySQL 8+/MariaDB).
ALTER TABLE `ProductVariant`
  ADD CONSTRAINT `variant_stock_bounds` CHECK (`stock` BETWEEN 0 AND 1000000),
  ADD CONSTRAINT `variant_price_bounds` CHECK (`priceMinor` BETWEEN 0 AND 1000000000),
  ADD CONSTRAINT `variant_threshold_bounds` CHECK (`lowStockThreshold` BETWEEN 0 AND 1000000),
  ADD CONSTRAINT `variant_sale_window` CHECK ((`salePriceMinor` IS NULL AND `saleStartsAt` IS NULL AND `saleEndsAt` IS NULL) OR (`salePriceMinor` IS NOT NULL AND `saleStartsAt` IS NOT NULL AND `saleEndsAt` IS NOT NULL AND `salePriceMinor` >= 0 AND `salePriceMinor` <= `priceMinor` AND `saleStartsAt` < `saleEndsAt`)),
  ADD CONSTRAINT `variant_stock_policy` CHECK (`stockPolicy` IN ('DENY', 'BACKORDER', 'PREORDER'));
ALTER TABLE `ProductReview` ADD CONSTRAINT `review_rating_bounds` CHECK (`rating` BETWEEN 1 AND 5);
ALTER TABLE `PriceTier` ADD CONSTRAINT `tier_bounds` CHECK (`minQuantity` BETWEEN 2 AND 10000 AND `priceMinor` BETWEEN 0 AND 1000000000);

