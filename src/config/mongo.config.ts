import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoConfig: MongooseModuleOptions = {
  uri: process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/ticketbox?authSource=admin',
};
