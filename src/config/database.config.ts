import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'ticketbox',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ticketbox_db',
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  synchronize: true, // Use true only for dev. Syncs entity changes to DB.
};
