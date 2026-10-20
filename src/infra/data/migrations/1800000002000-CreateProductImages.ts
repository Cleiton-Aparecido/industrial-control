import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImages1800000002000 implements MigrationInterface {
  name = 'CreateProductImages1800000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "storage_path" varchar(500) NOT NULL,
        "content_type" varchar(30) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_images" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_images_storage_path" UNIQUE ("storage_path"),
        CONSTRAINT "FK_product_images_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_product_images_content_type" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_product_images_product" ON "product_images" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}
