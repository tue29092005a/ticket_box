import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShowInfoDocument = ShowInfo & Document;

@Schema({ timestamps: true })
export class ShowInfo {
  @Prop({ required: true, unique: true })
  showId: string;

  @Prop()
  description: string;

  @Prop()
  artistBio: string;

  @Prop([String])
  mediaUrls: string[];

  @Prop()
  rules: string;
}

export const ShowInfoSchema = SchemaFactory.createForClass(ShowInfo);
