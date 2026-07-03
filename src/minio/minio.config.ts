import { S3Client } from '@aws-sdk/client-s3';

/**
 * Injection token for the MinIO S3Client.
 * Use @Inject(MINIO_CLIENT) to inject into services.
 */
export const MINIO_CLIENT = 'MINIO_CLIENT';

/**
 * Factory function that creates and returns a configured S3Client
 * pointed at the MinIO instance.
 *
 * CRITICAL: forcePathStyle MUST be true for MinIO.
 * Without it the SDK uses virtual-hosted-style URLs
 * (bucket.host:9000) which MinIO does not support.
 */
export function createMinioClient(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1', // MinIO ignores region but the SDK requires a value
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER || 'ticketbox_admin',
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'ticketbox_secret_2026',
    },
    forcePathStyle: true, // MANDATORY for MinIO — do not remove
  });
}
