import * as argon2 from 'argon2';
import { dataSource } from '../src/infra/data/data.config';

const permissions = [
  ['users.create', 'Criar usuários'],
  ['users.read', 'Consultar usuários'],
  ['users.update', 'Atualizar usuários'],
  ['users.delete', 'Desativar usuários'],
  ['users.status', 'Ativar e desativar usuários'],
  ['users.password.reset', 'Redefinir senhas de usuários'],
  ['roles.create', 'Criar papéis'],
  ['roles.read', 'Consultar papéis'],
  ['roles.update', 'Atualizar papéis'],
  ['roles.delete', 'Excluir papéis'],
  ['roles.assign', 'Associar papéis a usuários'],
  ['permissions.create', 'Criar permissões'],
  ['permissions.read', 'Consultar permissões'],
  ['permissions.update', 'Atualizar permissões'],
  ['permissions.delete', 'Excluir permissões'],
  ['reports.read', 'Consultar relatórios'],
  ['orders.create', 'Criar pedidos'],
  ['orders.read', 'Consultar pedidos'],
  ['orders.update', 'Atualizar pedidos'],
  ['orders.delete', 'Excluir pedidos'],
];

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment variable ${name} is missing`);
  }
  return value;
}

async function bootstrap(): Promise<void> {
  const name = requiredEnvironment('INITIAL_ADMIN_NAME');
  const email = requiredEnvironment('INITIAL_ADMIN_EMAIL').toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || !password.trim()) {
    throw new Error(
      'Required environment variable INITIAL_ADMIN_PASSWORD is missing',
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('INITIAL_ADMIN_EMAIL is invalid');
  }
  if (name.length < 2 || name.length > 150) {
    throw new Error(
      'INITIAL_ADMIN_NAME must contain between 2 and 150 characters',
    );
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD must contain between 12 and 128 characters',
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await dataSource.initialize();
  try {
    const result = await dataSource.transaction(async (manager) => {
      const existingUser = await manager.query(
        `SELECT "id" FROM "User" WHERE lower("email") = $1 LIMIT 1`,
        [email],
      );
      if (existingUser.length > 0) {
        return 'A user with INITIAL_ADMIN_EMAIL already exists; no data was changed.';
      }

      await manager.query(
        `INSERT INTO "roles" ("name", "slug", "description", "is_system")
         VALUES ('Administrator', 'administrator', 'System administrator', true)
         ON CONFLICT ("slug") DO NOTHING`,
      );
      const roles = await manager.query(
        `SELECT "id" FROM "roles" WHERE "slug" = 'administrator' FOR UPDATE`,
      );
      const roleId = roles[0]?.id as string | undefined;
      if (!roleId) {
        throw new Error('Could not resolve the administrator role');
      }

      const existingAdmin = await manager.query(
        `SELECT 1 FROM "user_roles" WHERE "role_id" = $1 LIMIT 1`,
        [roleId],
      );
      if (existingAdmin.length > 0) {
        return 'An administrator is already provisioned; no user data was changed.';
      }

      const permissionIds: string[] = [];
      for (const [slug, permissionName] of permissions) {
        await manager.query(
          `INSERT INTO "permissions" ("name", "slug", "description", "is_system")
           VALUES ($1, $2, $3, true)
           ON CONFLICT ("slug") DO NOTHING`,
          [permissionName, slug, permissionName],
        );
        const rows = await manager.query(
          `SELECT "id" FROM "permissions" WHERE "slug" = $1 LIMIT 1`,
          [slug],
        );
        permissionIds.push(rows[0].id as string);
      }

      const users = await manager.query(
        `INSERT INTO "User" ("name", "email", "password", "isActive", "mustChangePassword", "tokenVersion")
         VALUES ($1, $2, $3, true, false, 0) RETURNING "id"`,
        [name, email, passwordHash],
      );
      const userId = users[0].id as string;
      await manager.query(
        `INSERT INTO "user_roles" ("user_id", "role_id") VALUES ($1, $2)`,
        [userId, roleId],
      );
      for (const permissionId of permissionIds) {
        await manager.query(
          `INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permissionId],
        );
      }

      return 'Initial administrator provisioned successfully.';
    });
    console.info(result);
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Administrator bootstrap failed',
  );
  process.exitCode = 1;
});
