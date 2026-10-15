const { execSync } = require('child_process');

const name = process.argv[2];

if (!name) {
  console.error('Informe o nome da migration.');
  console.error('Exemplo: pnpm migration:generate CreateUsers');
  process.exit(1);
}

const command = [
  'typeorm-ts-node-commonjs',
  'migration:generate',
  `./src/infra/data/migrations/${name}`,
  '-d',
  './src/infra/data/data.config.ts',
].join(' ');

execSync(command, { stdio: 'inherit' });