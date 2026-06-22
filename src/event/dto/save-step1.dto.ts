export class SaveStep1Dto {
  name: string;
  category: string;
  address_type: 'OFFLINE' | 'ONLINE';
  venue_name?: string;
  province?: string;
  ward?: string;
  street?: string;
  image_url?: string;
  cover_image_url?: string;
  organizer_name: string;
  organizer_info?: string;
  organizer_logo_url?: string;
  description?: string;
}
