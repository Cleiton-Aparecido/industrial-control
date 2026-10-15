import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityAndRbac1791916800000 implements MigrationInterface {
  name = 'AddSecurityAndRbac1791916800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(
      `SELECT lower(trim("email")) AS email, count(*)::int AS total
       FROM "User" GROUP BY lower(trim("email")) HAVING count(*) > 1 LIMIT 1`,
    );
    if (duplicates.length > 0) {
      throw new Error(
        'Cannot add unique email index: duplicate normalized email exists. Resolve duplicates before migration.',
      );
    }

    await queryRunner.query(`UPDATE "User" SET "email" = lower(trim("email"))`);
    await queryRunner.query(
      `ALTER TABLE "User"
       ADD "isActive" boolean NOT NULL DEFAULT true,
       ADD "mustChangePassword" boolean NOT NULL DEFAULT false,
       ADD "tokenVersion" integer NOT NULL DEFAULT 0,
       ADD "deactivatedAt" timestamptz`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_User_email_lower" ON "User" (lower("email"))`,
    );
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(120) NOT NULL,
        "description" varchar(500),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_slug" UNIQUE ("slug")
      )`);
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "slug" varchar(160) NOT NULL,
        "description" varchar(500),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_slug" UNIQUE ("slug")
      )`);
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_role" ON "user_roles" ("role_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_permission" ON "role_permissions" ("permission_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id" uuid,
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(100) NOT NULL,
        "resource_id" varchar(150),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actor" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_created" ON "audit_logs" ("actor_user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resource_created" ON "audit_logs" ("resource_type", "resource_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "UQ_User_email_lower"`);
    await queryRunner.query(
      `ALTER TABLE "User"
       DROP COLUMN "deactivatedAt",
       DROP COLUMN "tokenVersion",
       DROP COLUMN "mustChangePassword",
       DROP COLUMN "isActive"`,
    );
  }
}
