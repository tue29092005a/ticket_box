import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShowInfoDocument = ShowInfo & Document;

@Schema()
export class ZoneSetup {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  color: string;

  @Prop([String])
  benefits: string[];
}
const ZoneSetupSchema = SchemaFactory.createForClass(ZoneSetup);

@Schema({ timestamps: true })
export class ShowInfo {
  @Prop({ required: true, unique: true })
  concert_id: number;

  @Prop()
  description: string;

  @Prop()
  artistBio: string;

  @Prop([String])
  mediaUrls: string[];

  @Prop()
  rules: string;

  @Prop()
  coverImage: string;

  @Prop({ type: [ZoneSetupSchema], default: [] })
  zoneSetups: ZoneSetup[];
}

export const ShowInfoSchema = SchemaFactory.createForClass(ShowInfo);
