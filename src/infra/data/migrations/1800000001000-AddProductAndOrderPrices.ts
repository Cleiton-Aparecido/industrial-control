import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAndOrderPrices1800000001000 implements MigrationInterface {
  name = 'AddProductAndOrderPrices1800000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD "price" numeric(14,2) NOT NULL DEFAULT 0.00,
      ADD CONSTRAINT "CK_products_price_nonnegative" CHECK ("price" >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD "unit_price_snapshot" numeric(14,2) NOT NULL DEFAULT 0.00,
      ADD CONSTRAINT "CK_order_items_unit_price_nonnegative" CHECK ("unit_price_snapshot" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP CONSTRAINT "CK_order_items_unit_price_nonnegative",
      DROP COLUMN "unit_price_snapshot"
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP CONSTRAINT "CK_products_price_nonnegative",
      DROP COLUMN "price"
    `);
  }
}
