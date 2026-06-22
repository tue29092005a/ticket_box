import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShowInfoDocument = ShowInfo & Document;

@Schema({ timestamps: true })
export class ShowInfo {
  // Identifier — maps to concerts.id (UUID)
  @Prop({ required: true, unique: true })
  showId: string;

  // ── Step 1: Event Info ─────────────────────────────────────────────
  @Prop()
  name: string;

  @Prop()
  category: string;

  @Prop({ enum: ['OFFLINE', 'ONLINE'] })
  address_type: string;

  @Prop()
  venue_name: string;

  @Prop()
  province: string;

  @Prop()
  ward: string;

  @Prop()
  street: string;

  @Prop()
  image_url: string;

  @Prop()
  cover_image_url: string;

  @Prop()
  organizer_name: string;

  @Prop()
  organizer_info: string;

  @Prop()
  organizer_logo_url: string;

  @Prop()
  description: string;

  // ── Step 3: Settings ────────────────────────────────────────────────
  @Prop({ enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' })
  privacy: string;

  @Prop()
  confirmation_message: string;

  // ── Step 4: Payment Info ─────────────────────────────────────────────
  @Prop()
  bank_account_name: string;

  @Prop()
  bank_account_number: string;

  @Prop()
  bank_name: string;

  @Prop()
  bank_branch: string;

  @Prop({ enum: ['INDIVIDUAL', 'COMPANY'] })
  vat_business_type: string;

  @Prop()
  vat_full_name: string;

  @Prop()
  vat_address: string;

  @Prop()
  vat_tax_code: string;
}

export const ShowInfoSchema = SchemaFactory.createForClass(ShowInfo);
