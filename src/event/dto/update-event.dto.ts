export class UpdateEventDto {
  // Step 1 fields (partial)
  image_url?: string;
  cover_image_url?: string;
  name?: string;
  address_type?: 'OFFLINE' | 'ONLINE';
  venue_name?: string;
  province?: string;
  ward?: string;
  street?: string;
  category?: string;
  description?: string;
  organizer_name?: string;
  organizer_info?: string;
  organizer_logo_url?: string;

  // Step 3 fields (partial)
  slug?: string;
  privacy?: 'PUBLIC' | 'PRIVATE';
  confirmation_message?: string;
}
