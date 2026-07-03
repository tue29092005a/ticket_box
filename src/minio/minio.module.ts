import { Global, Module } from '@nestjs/common';
import { MINIO_CLIENT, createMinioClient } from './minio.config';
import { MinioService } from './minio.service';

/**
 * Global module — imported once in AppModule.
 * MinioService is available in ALL other modules without re-importing.
 */
@Global()
@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: createMinioClient,
    },
    MinioService,
  ],
  exports: [MinioService],
})
export class MinioModule {}
