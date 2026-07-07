import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuestService } from './guest.service';
import { MinioService } from '../minio/minio.service';

/**
 * Trigger an import job using a MinIO object key.
 * fileKey — MinIO object key in ticketbox-csv-imports bucket
 *           Format: {showId}/{sponsorId}_{timestamp_ms}.csv
 *           Obtained from GET /api/admin/guests/csv-upload-url
 *
 * @deprecated filePath — kept for backward compatibility (Phase 2).
 *             Will be removed in Phase 4. Use fileKey instead.
 */
class TriggerImportDto {
  /** MinIO object key (preferred) */
  fileKey?: string;
  /** @deprecated Legacy local-filesystem path — use fileKey instead */
  filePath?: string;
  showId: string;
  sponsorId: string;
}

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * GET /api/admin/guests/csv-upload-url?showId=xxx&sponsorId=yyy
   *
   * Returns a presigned PUT URL for uploading a VIP CSV directly to MinIO.
   * Use the returned objectKey as the `fileKey` when calling POST /import.
   *
   * Response:
   * {
   *   presignedUrl:  string,  // PUT directly to this URL (TTL: 1 hour)
   *   objectKey:     string,  // pass this as fileKey in /import
   *   expiresIn:     3600,
   *   maxSizeBytes:  524288000  // 500 MB — client must enforce
   * }
   */
  @Get('guests/csv-upload-url')
  async getCsvUploadUrl(
    @Query('showId') showId: string,
    @Query('sponsorId') sponsorId: string,
  ) {
    return this.minioService.getCsvPresignedUploadUrl(showId, sponsorId);
  }

  /**
   * POST /api/admin/guests/import
   * Enqueues a VIP CSV import job. Returns 202 Accepted immediately;
   * actual processing is done by the background worker.
   * Returns 409 if the exact same file/show/sponsor was already submitted.
   *
   * Accepts either fileKey (MinIO, preferred) or filePath (legacy, deprecated).
   */
  @Post('guests/import')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerImport(@Body() body: TriggerImportDto) {
    // Prefer fileKey (MinIO path); fall back to filePath for backward compat
    const key = body.fileKey ?? body.filePath;
    return this.guestService.enqueueImport(key, body.showId, body.sponsorId);
  }

  /**
   * GET /api/admin/imports/:id
   * Poll progress of a single import job.
   */
  @Get('imports/:id')
  async getJobStatus(@Param('id') id: string) {
    return this.guestService.getJobStatus(id);
  }

  /**
   * GET /api/admin/imports?showId=xxx
   * List all import jobs, optionally filtered by showId (newest first).
   */
  @Get('imports')
  async listJobs(@Query('showId') showId?: string) {
    return this.guestService.listJobs(showId);
  }
}
