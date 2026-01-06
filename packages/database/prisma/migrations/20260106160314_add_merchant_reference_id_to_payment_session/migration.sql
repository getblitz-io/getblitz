/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,merchant_reference_id]` on the table `payment_session` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payment_session` ADD COLUMN `merchant_reference_id` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payment_session_organization_id_merchant_reference_id_key` ON `payment_session`(`organization_id`, `merchant_reference_id`);
