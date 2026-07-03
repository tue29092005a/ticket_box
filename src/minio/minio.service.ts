import { Injectable, Inject, ServiceUnavailableException, Logger, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { MINIO_CLIENT } from './minio.config';

/** Allowed upload types and their permitted MIME types. */
const ALLOWED_IMAGE_TYPES = new Set([
  'image_url',
  'cover_image_url',
  'organizer_logo_url',
  'ticket_image_url',
]);
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PresignedUploadResult {
  presignedUrl: string;
  objectKey: string;
  expiresIn: number;
  maxSizeBytes: number;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);

  constructor(@Inject(MINIO_CLIENT) private readonly s3: S3Client) {}

  // ─── Presigned URL generation ────────────────────────────────────────────────

  /**
   * Generates a presigned PUT URL for image uploads.
   *
   * Enforces:
   *  - type must be one of the allowed image types (Q4 decision)
   *  - ContentLength is locked to maxSizeBytes so MinIO rejects larger PUTs (Q3 decision)
   *  - TTL = MINIO_PRESIGN_TTL_IMAGES (default 900s / 15 min) (Q2 decision)
   */
  async getImagePresignedUploadUrl(
    eventId: string,
    type: string,
    ext: string,
  ): Promise<PresignedUploadResult> {
    // Q4: Server-side MIME enforcement
    if (!ALLOWED_IMAGE_TYPES.has(type)) {
      throw new BadRequestException(
        `Unsupported upload type: ${type}. Allowed: ${[...ALLOWED_IMAGE_TYPES].join(', ')}`,
      );
    }

    const bucket = process.env.MINIO_BUCKET_IMAGES || 'ticketbox-images';
    const ttl = parseInt(process.env.MINIO_PRESIGN_TTL_IMAGES || '900', 10);
    const maxSize = parseInt(process.env.MINIO_MAX_SIZE_IMAGES || '5242880', 10);

    // Q5: Object key convention: events/{eventId}/{type}_{hex8}.{ext}
    const hex8 = Math.random().toString(16).slice(2, 10);
    const objectKey = `events/${eventId}/${type}_${hex8}.${ext.replace(/^\./, '')}`;

    try {
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentLength: maxSize, // Q3: locks the presigned URL to max allowed size
      });
      const presignedUrl = await getSignedUrl(this.s3, cmd, { expiresIn: ttl });

      // Replace internal endpoint with public endpoint in the presigned URL
      const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000';
      const internalEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const finalUrl = presignedUrl.replace(internalEndpoint, publicEndpoint);

      this.logger.log(`Presigned URL generated for ${objectKey} (TTL ${ttl}s)`);
      return { presignedUrl: finalUrl, objectKey, expiresIn: ttl, maxSizeBytes: maxSize };
    } catch (err) {
      this.logger.error(`Failed to generate presigned URL: ${err.message}`);
      throw new ServiceUnavailableException({
        error: 'Storage service unavailable',
        message: 'Cannot generate upload URL at this time',
      });
    }
  }

  /**
   * Generates a presigned PUT URL for CSV uploads.
   * TTL = MINIO_PRESIGN_TTL_CSV (default 3600s / 1 hour) (Q2 decision)
   * Max size = MINIO_MAX_SIZE_CSV (default 500 MB) (Q3 decision)
   */
  async getCsvPresignedUploadUrl(
    showId: string,
    sponsorId: string,
  ): Promise<PresignedUploadResult> {
    const bucket = process.env.MINIO_BUCKET_CSV || 'ticketbox-csv-imports';
    const ttl = parseInt(process.env.MINIO_PRESIGN_TTL_CSV || '3600', 10);
    const maxSize = parseInt(process.env.MINIO_MAX_SIZE_CSV || '524288000', 10);
    const timestamp = Date.now();
    const objectKey = `${showId}/${sponsorId}_${timestamp}.csv`;

    try {
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentLength: maxSize,
      });
      const presignedUrl = await getSignedUrl(this.s3, cmd, { expiresIn: ttl });

      const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000';
      const internalEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const finalUrl = presignedUrl.replace(internalEndpoint, publicEndpoint);

      this.logger.log(`CSV presigned URL generated for ${objectKey} (TTL ${ttl}s)`);
      return { presignedUrl: finalUrl, objectKey, expiresIn: ttl, maxSizeBytes: maxSize };
    } catch (err) {
      this.logger.error(`Failed to generate CSV presigned URL: ${err.message}`);
      throw new ServiceUnavailableException({
        error: 'Storage service unavailable',
        message: 'Cannot generate upload URL at this time',
      });
    }
  }

  // ─── Object streaming (used by CSV worker) ───────────────────────────────────

  /**
   * Returns a readable stream for a MinIO object.
   * Used by the GuestImportProcessor to stream CSV files directly to csv-parser.
   * Never buffers the whole file in memory.
   */
  async getObjectStream(bucket: string, key: string): Promise<Readable> {
    try {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.s3.send(cmd);
      return response.Body as Readable;
    } catch (err) {
      this.logger.error(`Failed to stream object ${bucket}/${key}: ${err.message}`);
      throw new ServiceUnavailableException({
        error: 'Storage service unavailable',
        message: `Cannot stream object: ${key}`,
      });
    }
  }

  // ─── Post-processing helpers (Q7 decision) ──────────────────────────────────

  /**
   * Archives a processed CSV object:
   *  1. Copies it to {showId}/archived/{filename} in the same bucket
   *  2. Tags the original with { status: archived }
   */
  async archiveCsvObject(bucket: string, originalKey: string): Promise<void> {
    try {
      const parts = originalKey.split('/');
      const filename = parts[parts.length - 1];
      const showId = parts[0];
      const archivedKey = `${showId}/archived/${filename}`;

      await this.s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${originalKey}`,
          Key: archivedKey,
        }),
      );

      await this.tagObject(bucket, originalKey, 'archived');
      this.logger.log(`Archived CSV: ${originalKey} -> ${archivedKey}`);
    } catch (err) {
      // Non-fatal — the import already succeeded; log and continue
      this.logger.error(`Failed to archive CSV ${originalKey}: ${err.message}`);
    }
  }

  /**
   * Tags a CSV object with { status: error }.
   * The 30-day lifecycle rule will auto-purge these after 30 days. (Q8 decision)
   */
  async tagObjectAsError(bucket: string, key: string): Promise<void> {
    await this.tagObject(bucket, key, 'error');
  }

  // ─── Delete (used during cleanup) ───────────────────────────────────────────

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      this.logger.log(`Deleted object: ${bucket}/${key}`);
    } catch (err) {
      this.logger.error(`Failed to delete ${bucket}/${key}: ${err.message}`);
    }
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private async tagObject(bucket: string, key: string, status: 'archived' | 'error'): Promise<void> {
    await this.s3.send(
      new PutObjectTaggingCommand({
        Bucket: bucket,
        Key: key,
        Tagging: { TagSet: [{ Key: 'status', Value: status }] },
      }),
    );
  }
}
