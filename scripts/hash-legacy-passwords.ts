import * as argon2 from 'argon2';
import { dataSource } from '../src/infra/data/data.config';

async function migrateLegacyPasswords(): Promise<void> {
  await dataSource.initialize();
  try {
    const count = await dataSource.transaction(async (manager) => {
      const users = (await manager.query(
        `SELECT "id", "password" FROM "User"
        WHERE "password" NOT LIKE '$argon2%'
           AND "password" NOT LIKE '$2a$%'
           AND "password" NOT LIKE '$2b$%'
           AND "password" NOT LIKE '$2y$%'
         FOR UPDATE`,
      )) as Array<{ id: string; password: string }>;

      for (const user of users) {
        const passwordHash = await argon2.hash(user.password, {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        await manager.query(
          `UPDATE "User"
             SET "password" = $1, "mustChangePassword" = true,
               "updateAt" = now(),
               "tokenVersion" = "tokenVersion" + 1
           WHERE "id" = $2`,
          [passwordHash, user.id],
        );
      }
      return users.length;
    });
    console.info(
      `Rehashed ${count} legacy password(s); no credential values were logged.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

migrateLegacyPasswords().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Legacy password migration failed',
  );
  process.exitCode = 1;
});
