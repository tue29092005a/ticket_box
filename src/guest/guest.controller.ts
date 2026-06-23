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

class TriggerImportDto {
  /** Filename inside uploads/VIP_CSV/inbox/ */
  filePath: string;
  showId: string;
  sponsorId: string;
}

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  /**
   * POST /api/admin/guests/import
   * Enqueues a VIP CSV import job. Returns 202 Accepted immediately;
   * actual processing is done by the background worker.
   * Returns 409 if the exact same file/show/sponsor was already submitted.
   */
  @Post('guests/import')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerImport(@Body() body: TriggerImportDto) {
    return this.guestService.enqueueImport(
      body.filePath,
      body.showId,
      body.sponsorId,
    );
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
