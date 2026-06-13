import { Global, Module } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';

export const MEILISEARCH_CLIENT = 'MEILISEARCH_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: MEILISEARCH_CLIENT,
      useFactory: () => {
        return new MeiliSearch({
          host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
          apiKey: process.env.MEILISEARCH_API_KEY || 'ticketbox_master_key',
        });
      },
    },
  ],
  exports: [MEILISEARCH_CLIENT],
})
export class MeilisearchModule {}
