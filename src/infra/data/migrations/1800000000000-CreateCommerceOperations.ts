import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommerceOperations1800000000000 implements MigrationInterface {
  name = 'CreateCommerceOperations1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug", "description", "is_system") VALUES
        ('Criar produtos', 'products.create', 'Cadastrar produtos', true),
        ('Consultar produtos', 'products.read', 'Consultar e listar produtos', true),
        ('Atualizar produtos', 'products.update', 'Atualizar e ativar produtos', true),
        ('Desativar produtos', 'products.deactivate', 'Desativar produtos', true),
        ('Consultar estoque do produto', 'products.stock.read', 'Consultar saldo por produto', true),
        ('Consultar estoque', 'stock.read', 'Consultar saldos do estoque', true),
        ('Registrar entrada', 'stock.entry', 'Registrar entrada física de estoque', true),
        ('Registrar saída', 'stock.exit', 'Registrar saída física de estoque', true),
        ('Ajustar estoque', 'stock.adjust', 'Registrar ajuste justificado de estoque', true),
        ('Consultar movimentações', 'stock.movements.read', 'Consultar histórico de estoque', true),
        ('Criar clientes', 'customers.create', 'Cadastrar clientes', true),
        ('Consultar clientes', 'customers.read', 'Consultar clientes', true),
        ('Atualizar clientes', 'customers.update', 'Atualizar clientes e ativar cadastro', true),
        ('Desativar clientes', 'customers.deactivate', 'Desativar clientes', true),
        ('Consultar todos os pedidos', 'orders.read.all', 'Consultar pedidos de todos os vendedores', true),
        ('Cancelar pedidos de terceiros', 'orders.cancel.all', 'Cancelar pedidos fora do próprio escopo', true),
        ('Cancelar pedidos', 'orders.cancel', 'Cancelar pedidos próprios quando permitido', true),
        ('Consultar fila logística', 'logistics.orders.read', 'Consultar pedidos para logística', true),
        ('Iniciar processamento logístico', 'logistics.orders.process', 'Assumir processamento de pedidos', true),
        ('Preparar expedição', 'logistics.orders.prepare-shipment', 'Preparar pedido para expedição', true),
        ('Despachar pedido', 'logistics.orders.dispatch', 'Despachar pedido e baixar estoque', true),
        ('Confirmar entrega', 'logistics.orders.confirm-delivery', 'Confirmar entrega de pedido', true)
      ON CONFLICT ("slug") DO NOTHING`);
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(180) NOT NULL,
        "description" text,
        "sku" varchar(80),
        "unit" varchar(40) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_products_sku" ON "products" ("sku") WHERE "sku" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_type" varchar(4) NOT NULL,
        "document_number" varchar(14) NOT NULL,
        "name" varchar(180) NOT NULL,
        "trade_name" varchar(180),
        "address" jsonb,
        "phone" varchar(30),
        "email" varchar(255),
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customers_document_number" UNIQUE ("document_number"),
        CONSTRAINT "CK_customers_document_type" CHECK ("document_type" IN ('CPF', 'CNPJ'))
      )`);
    await queryRunner.query(`
      CREATE TABLE "stock_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "quantity_on_hand" numeric(14,3) NOT NULL DEFAULT 0,
        "quantity_reserved" numeric(14,3) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_balances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stock_balances_product" UNIQUE ("product_id"),
        CONSTRAINT "FK_stock_balances_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_stock_balances_nonnegative" CHECK ("quantity_on_hand" >= 0 AND "quantity_reserved" >= 0 AND "quantity_reserved" <= "quantity_on_hand")
      )`);
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "idempotency_key" varchar(150),
        "status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "customer_name_snapshot" varchar(180) NOT NULL,
        "customer_document_snapshot" varchar(14) NOT NULL,
        "delivery_address_snapshot" jsonb,
        "customer_notes" text,
        "internal_notes" text,
        "assigned_to_user_id" uuid,
        "processing_started_at" timestamptz,
        "ready_for_shipment_at" timestamptz,
        "shipped_at" timestamptz,
        "delivered_at" timestamptz,
        "delivery_notes" text,
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "cancelled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orders_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orders_assigned_to" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_orders_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "CK_orders_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'READY_FOR_SHIPMENT', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'))
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status_created" ON "orders" ("status", "created_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_name_snapshot" varchar(180) NOT NULL,
        "product_sku_snapshot" varchar(80),
        "unit_snapshot" varchar(40) NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_order_items_quantity" CHECK ("quantity" > 0)
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order" ON "order_items" ("order_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "movement_type" varchar(20) NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "quantity_before" numeric(14,3) NOT NULL,
        "quantity_after" numeric(14,3) NOT NULL,
        "reserved_before" numeric(14,3) NOT NULL DEFAULT 0,
        "reserved_after" numeric(14,3) NOT NULL DEFAULT 0,
        "reason" text NOT NULL,
        "reference_type" varchar(50),
        "reference_id" uuid,
        "idempotency_key" varchar(150),
        "performed_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_stock_movements_user" FOREIGN KEY ("performed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL,
        CONSTRAINT "CK_stock_movements_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "CK_stock_movements_type" CHECK ("movement_type" IN ('ENTRY', 'EXIT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVATION', 'RELEASE'))
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_stock_movements_idempotency" ON "stock_movements" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_product_created" ON "stock_movements" ("product_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_user_created" ON "stock_movements" ("performed_by_user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_reference" ON "stock_movements" ("reference_type", "reference_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "previous_status" varchar(30),
        "new_status" varchar(30) NOT NULL,
        "changed_by_user_id" uuid,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_history_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_order_history_user" FOREIGN KEY ("changed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_history_order_created" ON "order_status_history" ("order_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "stock_balances"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
