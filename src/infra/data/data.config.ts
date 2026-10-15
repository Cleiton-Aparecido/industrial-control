import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

export const DataConfigOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*.ts'],
  logging: process.env.NODE_ENV === 'local',
};

export const dataSource = new DataSource(DataConfigOptions);
