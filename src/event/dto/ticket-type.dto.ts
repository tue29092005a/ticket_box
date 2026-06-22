export class TicketTypeDto {
  name: string;
  price: number;
  is_free: boolean;
  total_quantity: number;
  min_per_order?: number;
  max_per_order?: number;
  sale_start?: string;
  sale_end?: string;
  description?: string;
  ticket_image_url?: string;
}
