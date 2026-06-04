import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { InfoController } from './info.controller';
import { InfoService } from './info.service';
import { Show } from './entities/show.entity';
import { ShowInfo, ShowInfoSchema } from './schemas/show-info.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show]),
    MongooseModule.forFeature([{ name: ShowInfo.name, schema: ShowInfoSchema }])
  ],
  controllers: [InfoController],
  providers: [InfoService],
  exports: [InfoService],
})
export class InfoModule {}
